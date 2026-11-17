import { ClockDialogPage } from '../pages/clock-dialog.page.js';
import { SelectLocationPage } from '../pages/select-location.page.js';

const noopRecorder = { step: async () => {} };

// Attempts to authenticate on the employee clock-in dialog with a credential
// that is expected to be rejected, and returns the error text the app shows.
// Throws if no error appears and the clock controls show instead — that would
// mean the wrong credential was wrongly accepted.
export async function attemptClockInWithWrongCredentials(
  driver,
  { email, wrongCredential, recorder = noopRecorder },
) {
  const selectLocation = new SelectLocationPage(driver);
  await selectLocation.waitUntilShown();
  await selectLocation.openClockDialog();
  await recorder.step('Clock-in dialog opened');

  const dialog = new ClockDialogPage(driver);
  await dialog.authenticate({ email, password: wrongCredential });
  await recorder.step('Wrong credential submitted');

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const errorText = await dialog.readAuthError();
    if (errorText) {
      await recorder.step('Rejected with an error, as expected', { message: errorText });
      return errorText;
    }
    if (await dialog.isVisible(dialog.startShiftButton)) {
      await recorder.step('Unexpectedly accepted — clock controls appeared');
      throw new Error('Wrong credential was accepted — clock controls appeared instead of an error.');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await recorder.step('No error appeared within 30s');
  throw new Error('No auth error appeared within 30s after submitting a wrong credential.');
}
