import { ancestor, byText, byType, descendant } from 'appium-flutter-finder';

import { isVisible, waitForVisible } from '../support/probe.js';

const SHOW_TIMEOUT_MS = 30_000;
const SUGGESTION_TIMEOUT_MS = 15_000;

// The owner form has no keys. A field's input is the TextField in the nearest
// Column that also holds the field's label.
export function inputFor(label) {
  return descendant({
    of: ancestor({ of: byText(label), matching: byType('Column'), firstMatchOnly: true }),
    matching: byType('TextField'),
    firstMatchOnly: true,
  });
}

export class OwnerFormPage {
  constructor(driver) {
    this.driver = driver;
    this.title = byText('Add Pet Owner');
    this.fields = {
      firstName: inputFor('First Name *'),
      lastName: inputFor('Last Name *'),
      email: inputFor('Email *'),
      mobile: inputFor('Mobile Number'),
      password: inputFor('Create Password *'),
      address: inputFor('Street Address'),
    };
    this.saveAndAddPet = byText('Save & Add Pet');
    this.addressSuggestion = byType('ListTile');
  }

  async waitUntilShown() {
    await waitForVisible(this.driver, this.title, SHOW_TIMEOUT_MS);
  }

  isTitleShown() {
    return isVisible(this.driver, this.title);
  }

  isTextShown(text) {
    return isVisible(this.driver, byText(text), 3_000);
  }

  async type(field, value) {
    await this.driver.elementSendKeys(this.fields[field], value);
  }

  async pickFirstAddress(query) {
    await this.type('address', query);
    await waitForVisible(this.driver, this.addressSuggestion, SUGGESTION_TIMEOUT_MS);
    await this.driver.elementClick(this.addressSuggestion);
  }

  // The button sits below the fold of the form. A tap on an off-screen button stalls the
  // driver, so the button is scrolled into view first.
  async submit() {
    await this.driver.execute('flutter:scrollIntoView', this.saveAndAddPet, { alignment: 0.5 });
    await this.driver.elementClick(this.saveAndAddPet);
  }
}
