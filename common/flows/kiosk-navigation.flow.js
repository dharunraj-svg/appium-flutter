import { byText } from 'appium-flutter-finder';

import { CheckInOutPage } from '../pages/kiosk-check-in-out.page.js';
import { KioskMainPage } from '../pages/kiosk-main.page.js';
import { SelectLocationPage } from '../pages/select-location.page.js';
import { setLocation } from '../support/device.js';
import { isVisible } from '../support/probe.js';

const noopRecorder = { step: async () => {} };
const OUTCOME_TIMEOUT_MS = 20_000;

// Continue needs a customer lookup first. A contact that is not a customer gives this
// popup for every visit type. Text from kiosk_main_screen.dart (_showAccountNotFound).
export const ACCOUNT_NOT_FOUND = Object.freeze({
  title: 'Account not found',
  description:
    "We couldn't find an account with this email or mobile number. Tap Sign Up Now to create a new account, or Retry to try a different email or phone.",
});

// From the select-location screen (after sign-in) to the check-in/check-out screen.
// Continue runs the geofence check against the simulated location.
export async function openCheckInOut(driver, { location, udid, platform, recorder = noopRecorder }) {
  await setLocation(platform, udid, location);
  const selectLocation = new SelectLocationPage(driver);
  await selectLocation.waitUntilShown();
  await selectLocation.tapContinue();
  await recorder.step('Tapped Continue on the location screen (geofence check runs)');
  await new CheckInOutPage(driver).waitUntilShown();
  await recorder.step('Check-in/check-out screen shown');
}

// Check In on the check-in/check-out screen opens the visit-type screen.
export async function openVisitTypes(driver, recorder = noopRecorder) {
  await new CheckInOutPage(driver).tapCheckIn();
  await new KioskMainPage(driver).waitUntilShown();
  await recorder.step('Visit-type screen shown after Check In');
}

// Opens the visit-type screen from wherever the test left off.
export async function ensureVisitTypes(driver, recorder = noopRecorder) {
  if (await new KioskMainPage(driver).isHeroShown()) return;
  await openVisitTypes(driver, recorder);
}

// Selects a visit-type card without pressing Continue.
export async function selectVisitType(driver, key, recorder = noopRecorder) {
  await new KioskMainPage(driver).selectVisitType(key);
  await recorder.step(`Selected the ${key} card`);
}

// Selects a visit-type card, types the contact, and presses Continue.
export async function chooseVisitType(driver, key, contact, recorder = noopRecorder) {
  await selectVisitType(driver, key, recorder);
  const main = new KioskMainPage(driver);
  await main.typeContact(contact);
  await recorder.step('Entered the contact');
  await main.tapContinue();
  await recorder.step('Tapped Continue');
}

// Waits for the account-not-found popup. A route pushed by Continue stays mounted under
// the screen it covers, so the popup's own text is checked rather than the visit screen going away.
export async function expectAccountNotFound(driver, recorder = noopRecorder) {
  const expected = [ACCOUNT_NOT_FOUND.title, ACCOUNT_NOT_FOUND.description];
  const deadline = Date.now() + OUTCOME_TIMEOUT_MS;
  for (;;) {
    const missing = [];
    for (const text of expected) {
      if (!(await isVisible(driver, byText(text), 1_000))) missing.push(text);
    }
    if (missing.length === 0) {
      await recorder.step('Account not found popup shown');
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Account not found popup not shown. Missing: ${missing.map((text) => `"${text}"`).join(', ')}`);
    }
  }
}
