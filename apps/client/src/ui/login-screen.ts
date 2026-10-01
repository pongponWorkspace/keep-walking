/**
 * `S-00-login` + its three email sub-screens (`S-00-login-email`, `S-00-register`, `S-00-forgot`,
 * design/ux/flows/F10-account-shell.md Flow A, components.md 16.6, tech note docs/tech/
 * F10-account-shell.md sections 1, 6, 8). Phase 2 has no real auth (R10/R12): every confirm button
 * bypasses straight to the next onboarding step, never reading whatever the player typed (R11 —
 * `onConfirm*` callbacks below take no arguments at all, by design, so there is nothing here even
 * capable of forwarding a typed value anywhere).
 *
 * Mounted once; the four views are four always-present `<div>`s toggled by `hidden`, never rebuilt
 * (tech note section 6 rule 1) — `showMain`/`showEmailLogin`/`showRegister`/`showForgot` are each a
 * no-op when that view is already the one showing (rule 5/P2-X59's own pattern,
 * `ui/age-gate-screen.ts#showGate`), so a `render()` pass that runs again mid-visit never resets
 * whatever the player is mid-typing. Every email/password `<input>` is cleared on `hide()` and every
 * `show*()` transition *away* from the view that owns it (rule 2: typed values belong to the DOM,
 * die the moment the screen is left, never carried in `OnboardingStepInput`/any render-time view).
 */
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

/** Brand display names for the two SDK buttons (components.md 16.6: "ข้อความ ... จาก copy key
 * account.loginGoogleButton/loginAppleButton" with `{providerName}` from the SDK — Phase 2 has no
 * real SDK, so this is the one, single place that stands in for it). Proper nouns, not Thai UI
 * copy (CLAUDE.md's copy-key rule governs sentences the narrative-designer writes, not a brand's
 * own name) — never rendered as a logo/wordmark image (components.md 16.6: "ไม่มีไฟล์ logo ใดใน
 * repo"). */
const PROVIDER_DISPLAY_NAME: Readonly<Record<'google' | 'apple', string>> = {
  google: 'Google',
  apple: 'Apple',
};

// icon-tone.ts's own literal token convention (design/ux/tokens.json, copied as a comment-named hex
// rather than a second runtime JSON parse for one call site).
const TOKEN_INK_900 = '#1A1A22';

export interface LoginScreenDeps {
  readonly onChooseGoogle: () => void;
  readonly onChooseApple: () => void;
  /** Main login -> `S-00-login-email` (flow A2). */
  readonly onEmailLink: () => void;
  readonly onConfirmEmailLogin: () => void;
  readonly onConfirmRegister: () => void;
  readonly onConfirmForgot: () => void;
  /** `S-00-login-email` -> `S-00-register` (flow A3). */
  readonly onRegisterLink: () => void;
  /** `S-00-login-email` -> `S-00-forgot` (flow A3). */
  readonly onForgotLink: () => void;
  /** `S-00-login-email` -> `S-00-login` (flow A3's own "กลับ" link). */
  readonly onBackToLogin: () => void;
  /** `S-00-register`/`S-00-forgot` -> `S-00-login-email` (flow A4/A5's own "กลับ" link). */
  readonly onBackToLoginEmail: () => void;
  readonly iconGlyph?: IconGlyphRenderer;
}

export interface LoginScreen {
  readonly root: HTMLElement;
  showMain(): void;
  showEmailLogin(): void;
  showRegister(): void;
  showForgot(): void;
  hide(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/** The two same-weight provider buttons (components.md 16.6): `.btn-secondary`, a game-owned
 * `icon.ui.sign-in` glyph (never a brand logo), copy key text with `{providerName}` substituted. */
function createProviderButton(
  className: string,
  copyKey: string,
  provider: 'google' | 'apple',
  iconGlyph: IconGlyphRenderer | undefined,
  onClick: () => void,
): HTMLButtonElement {
  const button = el('button', `btn btn-secondary login-provider-button ${className}`);
  button.type = 'button';
  const icon = el('span', 'login-provider-icon');
  button.append(icon);
  const label = el('span', 'login-provider-label');
  label.textContent = formatCopyText(copyKey, { providerName: PROVIDER_DISPLAY_NAME[provider] });
  button.append(label);
  button.addEventListener('click', onClick);
  void iconGlyph?.setIconGlyph(icon, 'icon.ui.sign-in', {
    altText: '',
    colorCss: TOKEN_INK_900,
    onNightBackground: false,
    nightPlateColorCss: '',
  });
  return button;
}

/** Password field markup every email form below shares (tech note section 6 rule 4, R11): real
 * `type="password"`, `autocomplete="new-password"` (never `"off"`, which some browsers ignore for
 * password fields and offer to save anyway) so Chrome/Safari never see the "submit" shape that
 * would trigger a save-password prompt — there is no `<form>` submission at all (the confirm
 * button is `type="button"`, no `action`, no navigation). */
function createPasswordField(labelKey: string): {
  readonly row: HTMLElement;
  readonly input: HTMLInputElement;
} {
  const row = el('div', 'login-field-row');
  const label = el('label', 'login-field-label');
  label.textContent = getCopyText(labelKey);
  const input = el('input', 'login-password-input');
  input.type = 'password';
  input.autocomplete = 'new-password';
  row.append(label, input);
  return { row, input };
}

function createEmailField(labelKey: string): {
  readonly row: HTMLElement;
  readonly input: HTMLInputElement;
} {
  const row = el('div', 'login-field-row');
  const label = el('label', 'login-field-label');
  label.textContent = getCopyText(labelKey);
  const input = el('input', 'login-email-input');
  input.type = 'email';
  input.autocomplete = 'off';
  row.append(label, input);
  return { row, input };
}

function createLink(className: string, copyKey: string, onClick: () => void): HTMLButtonElement {
  const link = el('button', `btn btn-secondary ${className}`);
  link.type = 'button';
  link.textContent = getCopyText(copyKey);
  link.addEventListener('click', onClick);
  return link;
}

type View = 'main' | 'email' | 'register' | 'forgot';

export function mountLoginScreen(container: HTMLElement, deps: LoginScreenDeps): LoginScreen {
  const root = el('div', 'screen login-screen');
  root.hidden = true;
  let active: View | undefined;

  // --- main view (A2) ---
  const mainView = el('div', 'login-main-view');
  const mainTitle = el('h1', 'login-title');
  mainTitle.textContent = getCopyText('account.loginTitle');
  const googleButton = createProviderButton(
    'login-google-button',
    'account.loginGoogleButton',
    'google',
    deps.iconGlyph,
    deps.onChooseGoogle,
  );
  const appleButton = createProviderButton(
    'login-apple-button',
    'account.loginAppleButton',
    'apple',
    deps.iconGlyph,
    deps.onChooseApple,
  );
  const emailLink = createLink('login-email-link', 'account.loginEmailLink', deps.onEmailLink);
  const mainTestNote = el('div', 'login-test-mode-note');
  mainTestNote.textContent = getCopyText('account.testModeNote');
  mainView.append(mainTitle, googleButton, appleButton, emailLink, mainTestNote);

  // --- email login view (A3) ---
  const emailView = el('div', 'login-email-screen');
  emailView.hidden = true;
  const emailTitle = el('h1', 'login-title');
  emailTitle.textContent = getCopyText('account.emailLoginTitle');
  const emailEmailField = createEmailField('account.emailLabel');
  const emailPasswordField = createPasswordField('account.passwordLabel');
  const emailConfirmButton = el('button', 'btn btn-primary login-email-confirm');
  emailConfirmButton.type = 'button';
  emailConfirmButton.textContent = getCopyText('account.emailLoginButton');
  emailConfirmButton.addEventListener('click', deps.onConfirmEmailLogin);
  const registerLink = createLink(
    'login-register-link',
    'account.registerLink',
    deps.onRegisterLink,
  );
  const forgotLink = createLink('login-forgot-link', 'account.forgotLink', deps.onForgotLink);
  const backToLoginLink = createLink(
    'login-back-to-login',
    'account.backToLogin',
    deps.onBackToLogin,
  );
  const emailTestNote = el('div', 'login-test-mode-note');
  emailTestNote.textContent = getCopyText('account.testModeNote');
  emailView.append(
    emailTitle,
    emailEmailField.row,
    emailPasswordField.row,
    emailConfirmButton,
    registerLink,
    forgotLink,
    backToLoginLink,
    emailTestNote,
  );

  // --- register view (A4) ---
  const registerView = el('div', 'register-screen');
  registerView.hidden = true;
  const registerTitle = el('h1', 'login-title');
  registerTitle.textContent = getCopyText('account.registerTitle');
  const registerEmailField = createEmailField('account.emailLabel');
  const registerPasswordField = createPasswordField('account.passwordLabel');
  const registerConfirmButton = el('button', 'btn btn-primary register-confirm');
  registerConfirmButton.type = 'button';
  registerConfirmButton.textContent = getCopyText('account.registerButton');
  registerConfirmButton.addEventListener('click', deps.onConfirmRegister);
  const registerBackLink = createLink(
    'register-back-to-login-email',
    'account.backToLogin',
    deps.onBackToLoginEmail,
  );
  const registerTestNote = el('div', 'login-test-mode-note');
  registerTestNote.textContent = getCopyText('account.testModeNote');
  registerView.append(
    registerTitle,
    registerEmailField.row,
    registerPasswordField.row,
    registerConfirmButton,
    registerBackLink,
    registerTestNote,
  );

  // --- forgot view (A5) ---
  const forgotView = el('div', 'forgot-screen');
  forgotView.hidden = true;
  const forgotTitle = el('h1', 'login-title');
  forgotTitle.textContent = getCopyText('account.forgotTitle');
  const forgotEmailField = createEmailField('account.emailLabel');
  const forgotConfirmButton = el('button', 'btn btn-primary forgot-confirm');
  forgotConfirmButton.type = 'button';
  forgotConfirmButton.textContent = getCopyText('account.forgotButton');
  forgotConfirmButton.addEventListener('click', deps.onConfirmForgot);
  const forgotBackLink = createLink(
    'forgot-back-to-login-email',
    'account.backToLogin',
    deps.onBackToLoginEmail,
  );
  const forgotTestNote = el('div', 'login-test-mode-note');
  forgotTestNote.textContent = getCopyText('account.testModeNote');
  forgotView.append(
    forgotTitle,
    forgotEmailField.row,
    forgotConfirmButton,
    forgotBackLink,
    forgotTestNote,
  );

  root.append(mainView, emailView, registerView, forgotView);
  container.append(root);

  /** R11/flow 9.1 "ค่าที่พิมพ์ในทุกช่องของ A3–A5 ถูกทิ้งทันทีที่ออกจากจอ": clears every input this
   * screen owns — called whenever any view other than the one just entered is left, and on `hide()`. */
  function clearAllFields(): void {
    emailEmailField.input.value = '';
    emailPasswordField.input.value = '';
    registerEmailField.input.value = '';
    registerPasswordField.input.value = '';
    forgotEmailField.input.value = '';
  }

  function setActive(view: View): void {
    if (active === view) return;
    active = view;
    clearAllFields();
    root.hidden = false;
    mainView.hidden = view !== 'main';
    emailView.hidden = view !== 'email';
    registerView.hidden = view !== 'register';
    forgotView.hidden = view !== 'forgot';
  }

  return {
    root,
    showMain() {
      setActive('main');
    },
    showEmailLogin() {
      setActive('email');
    },
    showRegister() {
      setActive('register');
    },
    showForgot() {
      setActive('forgot');
    },
    hide() {
      active = undefined;
      clearAllFields();
      root.hidden = true;
    },
  };
}
