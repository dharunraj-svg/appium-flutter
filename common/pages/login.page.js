import { byValueKey } from 'appium-flutter-finder';

const SHOW_TIMEOUT_MS = 60_000;

export class LoginPage {
  constructor(driver, { keyPrefix = 'kiosk_login' } = {}) {
    this.driver = driver;
    this.emailField = byValueKey(`${keyPrefix}_email_field`);
    this.passwordField = byValueKey(`${keyPrefix}_password_field`);
    this.signInButton = byValueKey(`${keyPrefix}_submit_button`);
  }

  async waitUntilShown() {
    await this.driver.execute('flutter:waitFor', this.signInButton, SHOW_TIMEOUT_MS);
  }

  async enterEmail(email) {
    await this.driver.elementSendKeys(this.emailField, email);
  }

  async enterPassword(password) {
    await this.driver.elementSendKeys(this.passwordField, password);
  }

  async submit() {
    await this.driver.elementClick(this.signInButton);
  }

  // One probe. True once the sign-in button has left the tree. The flow keeps
  // polling, because the biometric setup sheet can open before that happens.
  async isDismissed(probeTimeoutMs) {
    try {
      await this.driver.execute('flutter:waitForAbsent', this.signInButton, probeTimeoutMs);
      return true;
    } catch {
      return false;
    }
  }
}
