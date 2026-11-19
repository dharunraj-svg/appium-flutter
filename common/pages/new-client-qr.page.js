import { byText, byType } from 'appium-flutter-finder';

import { isVisible, waitForVisible } from '../support/probe.js';

const SHOW_TIMEOUT_MS = 30_000;

// The New client dialog. It draws a QR of the location's appQRLink. The content
// is not decoded; the page only reports whether a QR is drawn.
export class NewClientQrPage {
  constructor(driver) {
    this.driver = driver;
    this.title = byText('Download our app');
    this.qrImage = byType('QrImageView');
    this.unavailable = byText('QR code unavailable');
    this.registerHere = byText('Register Here');
  }

  async waitUntilShown() {
    await waitForVisible(this.driver, this.title, SHOW_TIMEOUT_MS);
  }

  isQrDrawn() {
    return isVisible(this.driver, this.qrImage);
  }

  isUnavailableShown() {
    return isVisible(this.driver, this.unavailable);
  }

  isRegisterHereShown() {
    return isVisible(this.driver, this.registerHere);
  }

  async tapRegisterHere() {
    await this.driver.elementClick(this.registerHere);
  }
}
