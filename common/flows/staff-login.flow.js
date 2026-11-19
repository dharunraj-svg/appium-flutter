import { BiometricSetupPage } from '../pages/biometric-setup.page.js';
import { LoginPage } from '../pages/login.page.js';

const SIGN_IN_TIMEOUT_MS = 60_000;
const PROBE_TIMEOUT_MS = 2_000;
const FRAME_SYNC_TIMEOUT_MS = 5_000;

const noopRecorder = { step: async () => {} };

// Signs the staff user in. Resolves to { biometricSetupShown }.
//
// Kennel and groomers can open the biometric setup sheet once the credentials
// are accepted. The login screen stays mounted behind the sheet, so sign-in is
// not finished until the sheet closes. It is closed with "Skip for now", which
// leaves biometric login off. Pass biometricSetup: true only for apps that
// show the sheet; the kiosk does not.
export async function loginAsStaff(driver, user, { keyPrefix, biometricSetup = false, recorder = noopRecorder } = {}) {
  const login = new LoginPage(driver, { keyPrefix });
  const setup = new BiometricSetupPage(driver);
  await login.waitUntilShown();
  await recorder.step('Login screen shown');

  await login.enterEmail(user.email);
  await login.enterPassword(user.password);
  await login.submit();
  await recorder.step('Credentials submitted');

  const biometricSetupShown = await waitForSignInToFinish(driver, login, setup, { biometricSetup, recorder });
  await recorder.step('Signed in — login screen dismissed');
  return { biometricSetupShown };
}

async function waitForSignInToFinish(driver, login, setup, { biometricSetup, recorder }) {
  if (biometricSetup) await setFrameSync(driver, false);
  try {
    const deadline = Date.now() + SIGN_IN_TIMEOUT_MS;
    let biometricSetupShown = false;

    while (Date.now() < deadline) {
      if (biometricSetup && !biometricSetupShown && (await setup.isShown(PROBE_TIMEOUT_MS))) {
        biometricSetupShown = true;
        await recorder.step('Biometric setup sheet shown');
        await setup.skip();
        await recorder.step('Tapped Skip for now');
        continue;
      }
      if (await login.isDismissed(PROBE_TIMEOUT_MS)) return biometricSetupShown;
    }

    throw new Error(`Login screen still visible after ${SIGN_IN_TIMEOUT_MS} ms`);
  } finally {
    if (biometricSetup) await setFrameSync(driver, true).catch(() => {});
  }
}

// While the sheet is open, the Sign in button stays in its loading state and its
// spinner keeps animating. Flutter Driver waits for frame sync before every find
// and tap, and that wait never finishes while an animation runs, so the sheet
// was never found. Frame sync is off only for the sign-in window.
function setFrameSync(driver, enabled) {
  return driver.execute('flutter:setFrameSync', enabled, FRAME_SYNC_TIMEOUT_MS);
}
