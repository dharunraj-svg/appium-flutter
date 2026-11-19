import { byText } from 'appium-flutter-finder';

import { CheckInOutPage } from '../pages/kiosk-check-in-out.page.js';
import { KioskMainPage } from '../pages/kiosk-main.page.js';
import { NewClientQrPage } from '../pages/new-client-qr.page.js';
import { OwnerFormPage } from '../pages/owner-form.page.js';
import { PetFormPage } from '../pages/pet-form.page.js';
import { isVisible } from '../support/probe.js';

const noopRecorder = { step: async () => {} };

// Street search used to pick the owner's address. The first suggestion is taken.
const ADDRESS_QUERY = 'Main Street';

// Every text must be on screen now. Throws with the missing texts listed.
export async function expectTexts(driver, texts, recorder = noopRecorder) {
  const missing = [];
  for (const text of texts) {
    if (!(await isVisible(driver, byText(text), 3_000))) missing.push(text);
  }
  if (missing.length > 0) {
    throw new Error(`Expected on screen but not found: ${missing.map((text) => `"${text}"`).join(', ')}`);
  }
  await recorder.step(`Shown: ${texts.join(' | ')}`);
}

// Every text must be off screen now. Throws with the unexpected texts listed.
export async function expectNoTexts(driver, texts, recorder = noopRecorder) {
  const present = [];
  for (const text of texts) {
    if (await isVisible(driver, byText(text), 1_000)) present.push(text);
  }
  if (present.length > 0) {
    throw new Error(`Should not be on screen: ${present.map((text) => `"${text}"`).join(', ')}`);
  }
  await recorder.step(`Not shown: ${texts.join(' | ')}`);
}

export async function openNewClientQr(driver, recorder = noopRecorder) {
  await new CheckInOutPage(driver).tapNewClient();
  await new NewClientQrPage(driver).waitUntilShown();
  await recorder.step('New client QR dialog shown');
}

export async function registerHere(driver, recorder = noopRecorder) {
  await new NewClientQrPage(driver).tapRegisterHere();
  await new OwnerFormPage(driver).waitUntilShown();
  await recorder.step('Add Pet Owner form shown (create mode)');
}

export async function submitEmptyOwnerForm(driver, recorder = noopRecorder) {
  await new OwnerFormPage(driver).submit();
  await recorder.step('Tapped Save & Add Pet with no values');
}

// Submits the form with invalid mobile, email and password values. Nothing is saved.
export async function submitInvalidOwnerForm(driver, recorder = noopRecorder) {
  const owner = new OwnerFormPage(driver);
  await owner.type('mobile', '123');
  await owner.type('email', 'not-an-email');
  await owner.type('password', 'ABCDEFGH');
  await recorder.step('Entered invalid mobile, email and password');
  await owner.submit();
  await recorder.step('Tapped Save & Add Pet');
}

export async function fillOwnerForm(driver, identity, password, recorder = noopRecorder) {
  const owner = new OwnerFormPage(driver);
  await owner.type('firstName', identity.firstName);
  await owner.type('lastName', identity.lastName);
  await owner.type('email', identity.email);
  await owner.type('mobile', identity.mobile);
  await owner.type('password', password);
  await recorder.step('Entered the QA owner name, email, mobile and password');
  await owner.pickFirstAddress(ADDRESS_QUERY);
  await recorder.step('Picked the first address suggestion');
}

export async function saveOwner(driver, recorder = noopRecorder) {
  await new OwnerFormPage(driver).submit();
  await recorder.step('Tapped Save & Add Pet');
  await new PetFormPage(driver).waitUntilShown();
  await recorder.step('Add Pet form shown');
}

export async function fillAndSavePet(driver, identity, recorder = noopRecorder) {
  const pet = new PetFormPage(driver);
  await pet.typePetName(identity.petName);
  await recorder.step('Entered the QA pet name');
  await pet.pickFirstPetType();
  await recorder.step('Picked the first pet type');
  await pet.submit();
  await recorder.step('Tapped Add Pet');
}

// The owner taps Check In after the pet is saved. The pet owner never clocks in.
export async function tapCheckInAfterPet(driver, recorder = noopRecorder) {
  const checkInOut = new CheckInOutPage(driver);
  await checkInOut.waitUntilShown();
  await checkInOut.tapCheckIn();
  await recorder.step('Pet owner tapped Check In');
  await new KioskMainPage(driver).waitUntilShown();
  await recorder.step('Visit-type screen shown for the pet owner');
}
