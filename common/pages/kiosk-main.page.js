import { byText, byType } from 'appium-flutter-finder';

import { isVisible, waitForVisible } from '../support/probe.js';

const SHOW_TIMEOUT_MS = 60_000;

export const VISIT_TYPES = Object.freeze({
  membership: 'Membership',
  appointment: 'Appointment',
  training: 'Training',
  walkIn: 'Walk-in',
});

// The visit-type screen opened by Check In. Cards select a type; Continue routes.
// The QR square has no text or key, so it is found by its widget type.
export class KioskMainPage {
  constructor(driver) {
    this.driver = driver;
    // The headline is rich text, which a text finder cannot match. The chip marks this screen.
    this.hero = byText('Back to home');
    this.selectPrompt = byText('Select a visit type to continue');
    this.continueButton = byText('Continue');
    this.backToHome = byText('Back to home');
    this.contactInput = byType('TextField');
    this.contactInputHint = byText('Please select a visit type first');
    this.qrSquare = byType('KioskQrSquareButton');
    this.scannerScreen = byType('CustomerQrScannerScreen');
    this.tiles = Object.fromEntries(
      Object.entries(VISIT_TYPES).map(([key, label]) => [key, byText(label)]),
    );
  }

  async waitUntilShown() {
    await waitForVisible(this.driver, this.hero, SHOW_TIMEOUT_MS);
  }

  isHeroShown() {
    return isVisible(this.driver, this.hero);
  }

  isSelectPromptShown() {
    return isVisible(this.driver, this.selectPrompt);
  }

  isContactHintShown() {
    return isVisible(this.driver, this.contactInputHint);
  }

  isBackToHomeShown() {
    return isVisible(this.driver, this.backToHome);
  }

  isTileShown(key) {
    return isVisible(this.driver, this.tiles[key]);
  }

  isScannerShown() {
    return isVisible(this.driver, this.scannerScreen, 5_000);
  }

  async typeContact(value) {
    await this.driver.elementSendKeys(this.contactInput, value);
  }

  async selectVisitType(key) {
    await this.driver.elementClick(this.tiles[key]);
  }

  async tapContinue() {
    await this.driver.elementClick(this.continueButton);
  }

  async tapBackToHome() {
    await this.driver.elementClick(this.backToHome);
  }

  async tapQrSquare() {
    await this.driver.elementClick(this.qrSquare);
  }
}
