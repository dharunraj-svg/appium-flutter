import { byValueKey } from 'appium-flutter-finder';

const SHOW_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;
const DISMISS_PROBE_TIMEOUT_MS = 3_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class LoginPage {
  constructor(driver) {
    this.driver = driver;
    this.emailField = byValueKey('kiosk_login_email_field');
    this.passwordField = byValueKey('kiosk_login_password_field');
    this.signInButton = byValueKey('kiosk_login_submit_button');
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

  async waitUntilDismissed(timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        await this.driver.execute('flutter:waitForAbsent', this.signInButton, DISMISS_PROBE_TIMEOUT_MS);
        return;
      } catch {
        await sleep(POLL_INTERVAL_MS);
      }
    }
    throw new Error(`Login screen still visible after ${timeoutMs} ms`);
  }
}
