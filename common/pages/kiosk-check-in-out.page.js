import { byText } from 'appium-flutter-finder';

import { isVisible, waitForVisible } from '../support/probe.js';

const SHOW_TIMEOUT_MS = 60_000;

export class CheckInOutPage {
  constructor(driver) {
    this.driver = driver;
    this.heading = byText('What would you like to do?');
    this.checkInBox = byText('Check In');
    this.checkOutBox = byText('Check Out');
    this.newClientButton = byText("I'm a new client");
  }

  async waitUntilShown() {
    await waitForVisible(this.driver, this.newClientButton, SHOW_TIMEOUT_MS);
  }

  isHeadingShown() {
    return isVisible(this.driver, this.heading);
  }

  isCheckInShown() {
    return isVisible(this.driver, this.checkInBox);
  }

  isCheckOutShown() {
    return isVisible(this.driver, this.checkOutBox);
  }

  isNewClientShown() {
    return isVisible(this.driver, this.newClientButton);
  }

  async tapCheckIn() {
    await this.driver.elementClick(this.checkInBox);
  }

  async tapNewClient() {
    await this.driver.elementClick(this.newClientButton);
  }
}
