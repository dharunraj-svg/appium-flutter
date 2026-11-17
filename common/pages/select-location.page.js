import { byText } from 'appium-flutter-finder';

const SHOW_TIMEOUT_MS = 60_000;

export class SelectLocationPage {
  constructor(driver) {
    this.driver = driver;
    this.clockChip = byText('Staff Clock-In/Out');
  }

  async waitUntilShown() {
    await this.driver.execute('flutter:waitFor', this.clockChip, SHOW_TIMEOUT_MS);
  }

  async openClockDialog() {
    await this.driver.elementClick(this.clockChip);
  }
}
