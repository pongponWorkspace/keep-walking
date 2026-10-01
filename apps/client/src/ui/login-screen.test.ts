// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountLoginScreen } from './login-screen';

function makeDeps() {
  return {
    onChooseGoogle: vi.fn(),
    onChooseApple: vi.fn(),
    onEmailLink: vi.fn(),
    onConfirmEmailLogin: vi.fn(),
    onConfirmRegister: vi.fn(),
    onConfirmForgot: vi.fn(),
    onRegisterLink: vi.fn(),
    onForgotLink: vi.fn(),
    onBackToLogin: vi.fn(),
    onBackToLoginEmail: vi.fn(),
  };
}

describe('mountLoginScreen', () => {
  it('starts hidden, with only the main view shown once showMain is called', () => {
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, makeDeps());
    expect(screen.root.hidden).toBe(true);
    screen.showMain();
    expect(screen.root.hidden).toBe(false);
    expect(container.querySelector('.login-main-view')?.hasAttribute('hidden')).toBe(false);
    expect(container.querySelector('.login-email-screen')?.hasAttribute('hidden')).toBe(true);
  });

  it('google/apple buttons call their own callback, never read any field', () => {
    const deps = makeDeps();
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, deps);
    screen.showMain();
    (container.querySelector('.login-google-button') as HTMLButtonElement).click();
    expect(deps.onChooseGoogle).toHaveBeenCalledTimes(1);
    (container.querySelector('.login-apple-button') as HTMLButtonElement).click();
    expect(deps.onChooseApple).toHaveBeenCalledTimes(1);
  });

  it('email link moves to the email-login sub-screen; confirm bypasses; back returns to main', () => {
    const deps = makeDeps();
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, deps);
    screen.showMain();
    (container.querySelector('.login-email-link') as HTMLButtonElement).click();
    expect(deps.onEmailLink).toHaveBeenCalledTimes(1);
    screen.showEmailLogin();
    expect(container.querySelector('.login-email-screen')?.hasAttribute('hidden')).toBe(false);
    (container.querySelector('.login-email-confirm') as HTMLButtonElement).click();
    expect(deps.onConfirmEmailLogin).toHaveBeenCalledTimes(1);
    (container.querySelector('.login-back-to-login') as HTMLButtonElement).click();
    expect(deps.onBackToLogin).toHaveBeenCalledTimes(1);
  });

  it('register/forgot links from email-login, each with a working back-to-email link', () => {
    const deps = makeDeps();
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, deps);
    screen.showEmailLogin();
    (container.querySelector('.login-register-link') as HTMLButtonElement).click();
    expect(deps.onRegisterLink).toHaveBeenCalledTimes(1);
    screen.showRegister();
    expect(container.querySelector('.register-screen')?.hasAttribute('hidden')).toBe(false);
    (container.querySelector('.register-confirm') as HTMLButtonElement).click();
    expect(deps.onConfirmRegister).toHaveBeenCalledTimes(1);
    (container.querySelector('.register-back-to-login-email') as HTMLButtonElement).click();
    expect(deps.onBackToLoginEmail).toHaveBeenCalledTimes(1);

    screen.showEmailLogin();
    (container.querySelector('.login-forgot-link') as HTMLButtonElement).click();
    expect(deps.onForgotLink).toHaveBeenCalledTimes(1);
    screen.showForgot();
    expect(container.querySelector('.forgot-screen')?.hasAttribute('hidden')).toBe(false);
    (container.querySelector('.forgot-confirm') as HTMLButtonElement).click();
    expect(deps.onConfirmForgot).toHaveBeenCalledTimes(1);
    (container.querySelector('.forgot-back-to-login-email') as HTMLButtonElement).click();
    expect(deps.onBackToLoginEmail).toHaveBeenCalledTimes(2);
  });

  it('password fields are real password inputs with autocomplete=new-password, never off', () => {
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, makeDeps());
    screen.showEmailLogin();
    const passwordInput = container.querySelector('.login-password-input') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
    expect(passwordInput.autocomplete).toBe('new-password');
  });

  it('every confirm button is type=button, inside no <form> submission path', () => {
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, makeDeps());
    screen.showEmailLogin();
    expect(container.querySelector('form')).toBeNull();
    expect((container.querySelector('.login-email-confirm') as HTMLButtonElement).type).toBe(
      'button',
    );
  });

  it('typed values are cleared once the view is left (R11) — never carried to the next visit', () => {
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, makeDeps());
    screen.showEmailLogin();
    const emailInput = container.querySelector('.login-email-input') as HTMLInputElement;
    const passwordInput = container.querySelector('.login-password-input') as HTMLInputElement;
    emailInput.value = 'a@b.com';
    passwordInput.value = 'secret';
    screen.showMain();
    screen.showEmailLogin();
    expect((container.querySelector('.login-email-input') as HTMLInputElement).value).toBe('');
    expect((container.querySelector('.login-password-input') as HTMLInputElement).value).toBe('');
  });

  it('is idempotent: calling showMain again while already on main does not reset the DOM subtree', () => {
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, makeDeps());
    screen.showMain();
    const before = container.querySelector('.login-main-view');
    screen.showMain();
    const after = container.querySelector('.login-main-view');
    expect(before).toBe(after);
  });

  it(
    'P2-X59 regression (qa test plan TC-F10-RENDER-01): repeated showEmailLogin calls while the ' +
      'player is still typing (simulating render() firing on every GPS sample/tick) never clear the ' +
      'email/password fields',
    () => {
      const container = document.createElement('div');
      const screen = mountLoginScreen(container, makeDeps());
      screen.showEmailLogin();
      const emailInput = container.querySelector('.login-email-input') as HTMLInputElement;
      const passwordInput = container.querySelector('.login-password-input') as HTMLInputElement;
      emailInput.value = 'still-typing@example';
      passwordInput.value = 'partial';
      for (let i = 0; i < 5; i++) {
        screen.showEmailLogin();
      }
      expect(emailInput.value).toBe('still-typing@example');
      expect(passwordInput.value).toBe('partial');
    },
  );

  it('hide() hides the whole screen and clears every field', () => {
    const container = document.createElement('div');
    const screen = mountLoginScreen(container, makeDeps());
    screen.showEmailLogin();
    (container.querySelector('.login-email-input') as HTMLInputElement).value = 'leak@example.com';
    screen.hide();
    expect(screen.root.hidden).toBe(true);
    expect((container.querySelector('.login-email-input') as HTMLInputElement).value).toBe('');
  });
});
