import { ClockDialogPage } from '../pages/clock-dialog.page.js';
import { SelectLocationPage } from '../pages/select-location.page.js';
import { setLocation } from '../support/device.js';

const noopRecorder = { step: async () => {} };

// Ending a shift closes the dialog entirely (it pops back to the location
// screen) — it does not reset to "Start Shift" within the same dialog. So
// recovering from any non-clean state (left mid-shift or mid-break by a
// previous run) always ends with re-opening the dialog and re-authenticating.
async function recoverToCleanState(dialog, selectLocation, employee, state, recorder) {
  if (state === 'off-shift') return;

  if (state === 'on-break') {
    await dialog.endBreak();
    await dialog.waitUntilShiftActive();
    await recorder.step('Recovered from a stale break left by a previous run');
  }

  await dialog.endShift();
  await dialog.waitUntilDismissed();
  await selectLocation.waitUntilShown();
  await selectLocation.openClockDialog();
  await dialog.authenticate(employee);
  await dialog.waitForClockControls();
  await recorder.step('Recovered from a stale shift left by a previous run');
}

// Best-effort cleanup for a mid-flow failure. Checks what's actually visible
// right now rather than assuming which step was reached — clicking a button
// that was never rendered just hangs retrying against a non-existent element.
async function bestEffortCleanup(dialog) {
  if (await dialog.isVisible(dialog.endBreakButton)) {
    await dialog.endBreak().catch(() => {});
    await dialog.waitUntilShiftActive().catch(() => {});
  }
  if (await dialog.isVisible(dialog.endShiftButton)) {
    await dialog.endShift().catch(() => {});
  }
}

export async function clockInAndOut(driver, { employee, location, udid, platform = 'ios', recorder = noopRecorder }) {
  await setLocation(platform, udid, location);

  const selectLocation = new SelectLocationPage(driver);
  await selectLocation.waitUntilShown();
  await selectLocation.openClockDialog();
  await recorder.step('Clock-in dialog opened');

  const dialog = new ClockDialogPage(driver, { androidDeviceId: platform === 'android' ? udid : null });
  await dialog.authenticate(employee);

  const initialState = await dialog.waitForClockControls();
  await recorder.step(`Authenticated as employee (initial state: ${initialState})`);
  await recoverToCleanState(dialog, selectLocation, employee, initialState, recorder);

  try {
    await dialog.startShift();
    await dialog.waitUntilOnShift();
    await recorder.step('Shift started');

    await dialog.startBreak();
    await dialog.waitUntilOnBreak();
    await recorder.step('Break started');

    await dialog.endBreak();
    await dialog.waitUntilShiftActive();
    await recorder.step('Break ended — shift active again');

    await dialog.endShift();
    await dialog.waitUntilDismissed();
    await selectLocation.waitUntilShown();
    await recorder.step('Shift ended — back at the location screen');
  } catch (error) {
    await recorder.step('Failure — attempting best-effort cleanup', { message: error.message });
    await bestEffortCleanup(dialog);
    throw error;
  }
}
