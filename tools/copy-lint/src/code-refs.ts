/**
 * Static scan of the copy keys that client code asks for (S15, F10 copy gate F-01b).
 *
 * Finds every call to `getCopyText` / `formatCopyText` / `getCopyEntry` and resolves its first
 * argument to the set of key strings it can be, using the TypeScript compiler (syntax + checker):
 *   - string literals and no-substitution template literals
 *   - `a ? 'x' : 'y'`, parentheses, `as` / `satisfies` / `!`
 *   - template literals: each `${expr}` is expanded when `expr` resolves to a finite set of
 *     literals (e.g. a string-literal union type such as `RejectReason`); otherwise the hole is
 *     kept as `${}` and the result is a *pattern* (see dynamic-keys.ts)
 *   - identifiers bound to a `const` initializer (also across imports)
 *   - `MAP[k]` / `MAP.k` / `obj.prop` on `const` object literals (`MAP[k]` = every value)
 *   - calls to a local function: the union of its `return` expressions
 *   - anything else: the checker's type, when it is a finite union of string/number literals
 * What stays unresolved (a `string`-typed parameter, a value built at runtime) is counted in
 * `unresolved` and not reported as a failure: the e2e raw-key check covers those at runtime.
 */
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

/** The functions in apps/client/src/copy/ (load.ts, format.ts) whose first argument is a key. */
export const COPY_LOOKUP_FUNCTIONS: ReadonlySet<string> = new Set([
  'getCopyText',
  'formatCopyText',
  'getCopyEntry',
]);

/** Placeholder for a template hole that could not be expanded. */
export const PATTERN_HOLE = '${}';

/** Guards against pathological code: recursion depth and template expansion size. */
const MAX_RESOLVE_DEPTH = 8;
const MAX_TEMPLATE_EXPANSIONS = 256;

export interface CodeSite {
  /** Path relative to the scan root (repo root), forward slashes. */
  readonly file: string;
  /** 1-based line of the lookup call. */
  readonly line: number;
}

export interface CodeKeyRef extends CodeSite {
  readonly key: string;
}

export interface CodeKeyPattern extends CodeSite {
  /** Key with `${}` holes, e.g. `story.slide${}.title`. */
  readonly pattern: string;
}

export interface CodeRefScan {
  readonly refs: readonly CodeKeyRef[];
  readonly patterns: readonly CodeKeyPattern[];
  readonly unresolved: readonly CodeSite[];
  /** Number of lookup calls seen (resolved, pattern, or unresolved). */
  readonly callCount: number;
}

interface Resolved {
  readonly values: readonly string[];
  readonly patterns: readonly string[];
  readonly unknown: boolean;
}

const UNKNOWN: Resolved = { values: [], patterns: [], unknown: true };

function merge(parts: readonly Resolved[]): Resolved {
  return {
    values: [...new Set(parts.flatMap((part) => part.values))],
    patterns: [...new Set(parts.flatMap((part) => part.patterns))],
    unknown: parts.some((part) => part.unknown),
  };
}

function only(values: readonly string[]): Resolved {
  return { values, patterns: [], unknown: false };
}

function stripWrappers(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** Finite string/number literal set of a type, or `undefined` when the type is open. */
function literalsOfType(type: ts.Type): readonly string[] | undefined {
  const members = type.isUnion() ? type.types : [type];
  const out: string[] = [];
  for (const member of members) {
    if (member.isStringLiteral()) {
      out.push(member.value);
    } else if (member.isNumberLiteral()) {
      out.push(String(member.value));
    } else {
      return undefined;
    }
  }
  return out.length > 0 ? out : undefined;
}

/** Resolves expressions to the key strings they can evaluate to. One instance per program. */
class KeyResolver {
  constructor(private readonly checker: ts.TypeChecker) {}

  private declarationOf(node: ts.Node): ts.Declaration | undefined {
    let symbol = this.checker.getSymbolAtLocation(node);
    if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) {
      symbol = this.checker.getAliasedSymbol(symbol);
    }
    return symbol?.valueDeclaration ?? symbol?.declarations?.[0];
  }

  /** The initializer of a `const x = ...` declaration the identifier points at. */
  private constInitializer(node: ts.Node): ts.Expression | undefined {
    const decl = this.declarationOf(node);
    if (decl === undefined || !ts.isVariableDeclaration(decl) || decl.initializer === undefined) {
      return undefined;
    }
    const list = decl.parent;
    if (!ts.isVariableDeclarationList(list) || (list.flags & ts.NodeFlags.Const) === 0) {
      return undefined;
    }
    return decl.initializer;
  }

  /** The object literals an expression can be (const maps, nested maps, a const bound to one). */
  private objectsOf(node: ts.Expression, depth: number): readonly ts.ObjectLiteralExpression[] {
    if (depth > MAX_RESOLVE_DEPTH) return [];
    const expr = stripWrappers(node);
    if (ts.isObjectLiteralExpression(expr)) return [expr];
    if (ts.isIdentifier(expr)) {
      const init = this.constInitializer(expr);
      return init === undefined ? [] : this.objectsOf(init, depth + 1);
    }
    if (ts.isConditionalExpression(expr)) {
      return [
        ...this.objectsOf(expr.whenTrue, depth + 1),
        ...this.objectsOf(expr.whenFalse, depth + 1),
      ];
    }
    if (ts.isElementAccessExpression(expr) || ts.isPropertyAccessExpression(expr)) {
      return this.memberInitializers(expr, depth).flatMap((init) =>
        this.objectsOf(init, depth + 1),
      );
    }
    return [];
  }

  /** Initializers of the properties `obj.name` / `obj[k]` can read; `[]` when unknown. */
  private memberInitializers(
    expr: ts.ElementAccessExpression | ts.PropertyAccessExpression,
    depth: number,
  ): readonly ts.Expression[] {
    const objects = this.objectsOf(expr.expression, depth + 1);
    let wanted: string | undefined;
    if (ts.isPropertyAccessExpression(expr)) {
      wanted = expr.name.text;
    } else {
      const arg = stripWrappers(expr.argumentExpression);
      if (ts.isStringLiteralLike(arg) || ts.isNumericLiteral(arg)) wanted = arg.text;
    }
    const out: ts.Expression[] = [];
    for (const object of objects) {
      for (const prop of object.properties) {
        if (!ts.isPropertyAssignment(prop)) continue;
        const name = prop.name;
        const propName =
          ts.isIdentifier(name) || ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)
            ? name.text
            : undefined;
        if (wanted === undefined || propName === wanted) out.push(prop.initializer);
      }
    }
    return out;
  }

  /** `return` expressions of a function body, skipping nested functions. */
  private returnExpressions(fn: ts.SignatureDeclaration): readonly ts.Expression[] | undefined {
    const body = (fn as { body?: ts.Node }).body;
    if (body === undefined) return undefined;
    if (!ts.isBlock(body)) return [body as ts.Expression];
    const out: ts.Expression[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node) && node.expression !== undefined) out.push(node.expression);
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(body, visit);
    return out;
  }

  private functionOf(callee: ts.Expression): ts.SignatureDeclaration | undefined {
    const decl = this.declarationOf(stripWrappers(callee));
    if (decl === undefined) return undefined;
    if (ts.isFunctionDeclaration(decl)) return decl;
    if (ts.isVariableDeclaration(decl) && decl.initializer !== undefined) {
      const init = stripWrappers(decl.initializer);
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) return init;
    }
    return undefined;
  }

  private fromType(expr: ts.Expression): Resolved {
    const literals = literalsOfType(this.checker.getTypeAtLocation(expr));
    return literals === undefined ? UNKNOWN : only(literals);
  }

  private template(expr: ts.TemplateExpression, depth: number): Resolved {
    // Each segment is either a finite list of strings or a hole.
    let combos: string[] = [expr.head.text];
    let hasHole = false;
    for (const span of expr.templateSpans) {
      const part = this.resolve(span.expression, depth + 1);
      const finite = !part.unknown && part.patterns.length === 0 && part.values.length > 0;
      const next: string[] = [];
      if (finite && combos.length * part.values.length <= MAX_TEMPLATE_EXPANSIONS) {
        for (const prefix of combos) {
          for (const value of part.values) next.push(prefix + value + span.literal.text);
        }
      } else {
        hasHole = true;
        for (const prefix of combos) next.push(prefix + PATTERN_HOLE + span.literal.text);
      }
      combos = [...new Set(next)];
    }
    return hasHole ? { values: [], patterns: combos, unknown: false } : only(combos);
  }

  resolve(node: ts.Expression, depth = 0): Resolved {
    if (depth > MAX_RESOLVE_DEPTH) return UNKNOWN;
    const expr = stripWrappers(node);
    if (ts.isStringLiteralLike(expr) || ts.isNumericLiteral(expr)) return only([expr.text]);
    if (ts.isTemplateExpression(expr)) return this.template(expr, depth);
    if (ts.isConditionalExpression(expr)) {
      return merge([
        this.resolve(expr.whenTrue, depth + 1),
        this.resolve(expr.whenFalse, depth + 1),
      ]);
    }
    const typed = this.fromType(expr);
    if (!typed.unknown) return typed;
    if (ts.isIdentifier(expr)) {
      const init = this.constInitializer(expr);
      return init === undefined ? UNKNOWN : this.resolve(init, depth + 1);
    }
    if (ts.isElementAccessExpression(expr) || ts.isPropertyAccessExpression(expr)) {
      const inits = this.memberInitializers(expr, depth);
      return inits.length === 0
        ? UNKNOWN
        : merge(inits.map((init) => this.resolve(init, depth + 1)));
    }
    if (ts.isCallExpression(expr)) {
      const fn = this.functionOf(expr.expression);
      const returns = fn === undefined ? undefined : this.returnExpressions(fn);
      if (returns === undefined || returns.length === 0) return UNKNOWN;
      return merge(returns.map((ret) => this.resolve(ret, depth + 1)));
    }
    return UNKNOWN;
  }
}

function calleeName(callee: ts.Expression): string | undefined {
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return undefined;
}

/**
 * Scans every source file of `program` for which `include(absolutePath)` is true. Paths in the
 * result are relative to `rootDir` with forward slashes, so output is stable across machines.
 */
export function scanProgram(
  program: ts.Program,
  options: { readonly rootDir: string; readonly include: (fileName: string) => boolean },
): CodeRefScan {
  const resolver = new KeyResolver(program.getTypeChecker());
  const refs: CodeKeyRef[] = [];
  const patterns: CodeKeyPattern[] = [];
  const unresolved: CodeSite[] = [];
  let callCount = 0;
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile || !options.include(sourceFile.fileName)) continue;
    const file = relative(options.rootDir, sourceFile.fileName).split('\\').join('/');
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const name = calleeName(node.expression);
        const arg = node.arguments[0];
        if (name !== undefined && COPY_LOOKUP_FUNCTIONS.has(name) && arg !== undefined) {
          callCount += 1;
          const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const result = resolver.resolve(arg);
          for (const key of result.values) refs.push({ file, line, key });
          for (const pattern of result.patterns) patterns.push({ file, line, pattern });
          if (result.unknown) unresolved.push({ file, line });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  return { refs, patterns, unresolved, callCount };
}

/** A program over the files a tsconfig.json includes, with that tsconfig's compiler options. */
export function programFromTsconfig(tsconfigPath: string): ts.Program {
  const absolute = resolve(tsconfigPath);
  const read = ts.readConfigFile(absolute, (path) => ts.sys.readFile(path));
  if (read.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(read.error.messageText, '\n'));
  }
  const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(absolute));
  return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
}

/**
 * An in-memory program for unit tests: `files` maps absolute paths to source text. No lib files
 * are loaded (`noLib`), which is enough for literal/union/const resolution.
 */
export function programFromSources(files: Readonly<Record<string, string>>): ts.Program {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    noLib: true,
    noEmit: true,
  };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (fileName, languageVersion) => {
    const text = files[fileName];
    return text === undefined
      ? undefined
      : ts.createSourceFile(fileName, text, languageVersion, true);
  };
  host.fileExists = (fileName) => files[fileName] !== undefined;
  host.readFile = (fileName) => files[fileName];
  host.directoryExists = (dir) => Object.keys(files).some((name) => name.startsWith(`${dir}/`));
  host.realpath = (path) => path;
  host.getCurrentDirectory = () => '/';
  return ts.createProgram({ rootNames: Object.keys(files), options, host });
}

/** Client sources S15 scans: apps/client/src, minus tests (they look up fixture keys). */
export const CLIENT_TSCONFIG = 'apps/client/tsconfig.json';
export const CLIENT_SOURCE_DIR = 'apps/client/src/';
const TEST_FILE_SUFFIX = '.test.ts';

/** Scans the client app under `repoRoot`; `undefined` when the app does not exist there. */
export function scanClientCopyRefs(repoRoot: string): CodeRefScan | undefined {
  const tsconfigPath = resolve(repoRoot, CLIENT_TSCONFIG);
  if (!ts.sys.fileExists(tsconfigPath)) return undefined;
  const sourceDir = `${resolve(repoRoot, CLIENT_SOURCE_DIR).split('\\').join('/')}/`;
  return scanProgram(programFromTsconfig(tsconfigPath), {
    rootDir: repoRoot,
    include: (fileName) =>
      fileName.split('\\').join('/').startsWith(sourceDir) && !fileName.endsWith(TEST_FILE_SUFFIX),
  });
}
