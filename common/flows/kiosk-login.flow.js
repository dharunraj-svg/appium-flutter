import { loginAsStaff } from './staff-login.flow.js';

export async function loginAsKioskStaff(driver, user, { recorder } = {}) {
  return loginAsStaff(driver, user, { keyPrefix: 'kiosk_login', recorder });
}
