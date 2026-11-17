import { LoginPage } from '../pages/login.page.js';

const LOGIN_DISMISS_TIMEOUT_MS = 60_000;

const noopRecorder = { step: async () => {} };

export async function loginAsStaff(driver, user, { keyPrefix, recorder = noopRecorder } = {}) {
  const login = new LoginPage(driver, { keyPrefix });
  await login.waitUntilShown();
  await recorder.step('Login screen shown');

  await login.enterEmail(user.email);
  await login.enterPassword(user.password);
  await login.submit();
  await recorder.step('Credentials submitted');

  await login.waitUntilDismissed(LOGIN_DISMISS_TIMEOUT_MS);
  await recorder.step('Signed in — login screen dismissed');
}
