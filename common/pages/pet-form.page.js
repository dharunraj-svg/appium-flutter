import { byText, byType, descendant } from 'appium-flutter-finder';

import { isVisible, waitForVisible } from '../support/probe.js';
import { inputFor } from './owner-form.page.js';

const SHOW_TIMEOUT_MS = 30_000;
const OPTION_TIMEOUT_MS = 15_000;

export class PetFormPage {
  constructor(driver) {
    this.driver = driver;
    this.sectionTitle = byText('Basic Information');
    this.petName = inputFor('Pet Name');
    this.petTypeTrigger = byText('Select pet type');
    this.firstPetTypeOption = byType('ListTile');
    this.addPet = descendant({
      of: byType('PetSubmitButton'),
      matching: byText('Add Pet'),
      firstMatchOnly: true,
    });
  }

  async waitUntilShown() {
    await waitForVisible(this.driver, this.sectionTitle, SHOW_TIMEOUT_MS);
  }

  isTextShown(text) {
    return isVisible(this.driver, byText(text), 3_000);
  }

  async typePetName(name) {
    await this.driver.elementSendKeys(this.petName, name);
  }

  async pickFirstPetType() {
    await this.driver.elementClick(this.petTypeTrigger);
    await waitForVisible(this.driver, this.firstPetTypeOption, OPTION_TIMEOUT_MS);
    await this.driver.elementClick(this.firstPetTypeOption);
  }

  async submit() {
    await this.driver.elementClick(this.addPet);
  }
}
