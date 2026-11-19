import { byTooltip, byType, byValueKey, descendant } from 'appium-flutter-finder';

import { dismissNotRespondingDialog } from '../support/android.js';

const SHORT_WAIT_MS = 30_000;
const PROBE_TIMEOUT_MS = 1_000;
const POLL_INTERVAL_MS = 500;
const STALL_CHECK_INTERVAL_MS = 5_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class ClockDialogPage {
  constructor(driver, { androidDeviceId = null } = {}) {
    this.driver = driver;
    this.androidDeviceId = androidDeviceId;
    this.lastStallCheck = 0;
    this.emailField = byValueKey('kiosk_clock_email_field');
    this.passwordField = byValueKey('kiosk_clock_password_field');
    this.continueButton = byValueKey('kiosk_clock_continue_button');
    this.startShiftButton = byValueKey('kiosk_clock_start_shift_button');
    this.endBreakButton = byValueKey('kiosk_clock_end_break_button');
    this.startBreakButton = byValueKey('kiosk_clock_start_break_button');
    this.endShiftButton = byValueKey('kiosk_clock_end_shift_button');
    // The header close icon. It has a tooltip but no key.
    this.closeButton = byTooltip('Close');
    this.actionErrorNotice = byValueKey('kiosk_clock_action_error_notice');
    this.authErrorNotice = byValueKey('kiosk_clock_auth_error_notice');
    // getText only reads an actual Text/RichText/EditableText widget, not a
    // composite wrapper — EmployeeClockErrorNotice's key is on its outer
    // Container, so reading its message needs the inner Text descendant.
    this.actionErrorText = descendant({
      of: this.actionErrorNotice,
      matching: byType('Text'),
      firstMatchOnly: true,
    });
    this.authErrorText = descendant({
      of: this.authErrorNotice,
      matching: byType('Text'),
      firstMatchOnly: true,
    });
  }

  async authenticate(employee) {
    await this.waitUntilOpen();
    await this.driver.elementSendKeys(this.emailField, employee.email);
    await this.driver.elementSendKeys(this.passwordField, employee.password);
    await this.driver.elementClick(this.continueButton);
  }

  async isVisible(finder) {
    try {
      await this.driver.execute('flutter:waitFor', finder, PROBE_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  async dismissStalls() {
    if (!this.androidDeviceId || Date.now() - this.lastStallCheck < STALL_CHECK_INTERVAL_MS) return;
    this.lastStallCheck = Date.now();
    await dismissNotRespondingDialog(this.androidDeviceId).catch(() => {});
  }

  async readActionError() {
    try {
      return await this.driver.getElementText(this.actionErrorText);
    } catch {
      return null;
    }
  }

  async readAuthError() {
    try {
      return await this.driver.getElementText(this.authErrorText);
    } catch {
      return null;
    }
  }

  // Three mutually exclusive states (see _buildClockControls in
  // employee_clock_dialog.dart): not started (Start Shift only), active and
  // not on break (Start Break + End Shift), on break (End Break only).
  async waitForClockControls(timeoutMs = SHORT_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isVisible(this.startShiftButton)) return 'off-shift';
      if (await this.isVisible(this.endBreakButton)) return 'on-break';
      if (await this.isVisible(this.endShiftButton)) return 'on-shift';
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error('Clock controls did not appear after authentication');
  }

  async startShift() {
    await this.driver.elementClick(this.startShiftButton);
  }

  async startBreak() {
    await this.driver.elementClick(this.startBreakButton);
  }

  async endBreak() {
    await this.driver.elementClick(this.endBreakButton);
  }

  async endShift() {
    await this.driver.elementClick(this.endShiftButton);
  }

  async close() {
    await this.driver.elementClick(this.closeButton);
  }

  async waitUntilClosed(timeoutMs = SHORT_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (!(await this.isVisible(this.emailField))) return;
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error('Clock dialog did not close after tapping Close');
  }

  async waitUntil(finder, expected, timeoutMs = SHORT_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await this.isVisible(finder)) === expected) return;
      const errorText = await this.readActionError();
      if (errorText) {
        throw new Error(`Clock action failed on screen: ${errorText}`);
      }
      await this.dismissStalls();
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`Timed out waiting for the clock state to change (expected visible=${expected})`);
  }

  async waitUntilOnShift() {
    await this.waitUntil(this.endShiftButton, true);
  }

  async waitUntilOffShift() {
    await this.waitUntil(this.startShiftButton, true);
  }

  async waitUntilOnBreak() {
    await this.waitUntil(this.endBreakButton, true);
  }

  // Back to "on shift, not on break" — Start Break is visible again.
  async waitUntilShiftActive() {
    await this.waitUntil(this.startBreakButton, true);
  }

  // The location screen stays mounted underneath the dialog, so its clock chip
  // is visible whether the dialog is open, closing, or gone. Only the dialog's
  // own fields tell us when it has actually opened.
  async waitUntilOpen(timeoutMs = SHORT_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.isVisible(this.emailField)) return;
      await this.dismissStalls();
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error('Clock-in dialog did not open — the email field never appeared');
  }

  // Ending a shift closes the dialog. Wait for its controls to disappear before
  // treating the location screen as ready for the next tap on the clock chip.
  async waitUntilDismissed() {
    await this.waitUntil(this.endShiftButton, false);
  }
}
