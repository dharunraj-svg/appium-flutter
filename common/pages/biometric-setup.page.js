import { byText } from 'appium-flutter-finder';

const SKIP_LABEL = 'Skip for now';

// The biometric setup sheet opens after sign-in on kennel and groomers when the
// device has Face ID or a fingerprint enrolled and biometric login is still off.
// The app gives the sheet no key yet, so its "Skip for now" button is found by
// label. Add a key to the button in staff_app_ui and switch this locator to it.
export class BiometricSetupPage {
  constructor(driver) {
    this.driver = driver;
    this.skipButton = byText(SKIP_LABEL);
  }

  async isShown(timeoutMs) {
    try {
      await this.driver.execute('flutter:waitFor', this.skipButton, timeoutMs);
      return true;
    } catch {
      return false;
    }
  }

  async skip() {
    await this.driver.elementClick(this.skipButton);
  }
}
