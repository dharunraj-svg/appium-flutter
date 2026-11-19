import { setFrameSync } from '../support/frame-sync.js';
import { openSession, closeSession } from '../support/session.js';
import { grantLocationPermission } from '../support/simulator.js';
import { openCheckInOut } from './kiosk-navigation.flow.js';
import { loginAsKioskStaff } from './kiosk-login.flow.js';

// Opens a session, grants the iOS permissions the kiosk asks for, signs in, and opens
// the check-in/check-out screen. A case that opens a route or the QR scanner uses its
// own session, so nothing is left open for the next case.
export async function startKioskSession(config, { frameSyncOff = false } = {}) {
  const driver = await openSession(config);
  try {
    if (frameSyncOff) await setFrameSync(driver, false);
    if (config.app.platform === 'ios') {
      // Only the location grant. A permission grant after launch can stop the kiosk app
      // (granting the camera did), so the QR scanner's camera prompt is left to the
      // autoAcceptAlerts capability.
      await grantLocationPermission(config.device.udid, config.app.bundleId);
    }
    await loginAsKioskStaff(driver, config.users.kioskStaff);
    await openCheckInOut(driver, {
      location: config.location,
      udid: config.device.udid,
      platform: config.app.platform,
    });
    return driver;
  } catch (error) {
    await closeSession(driver).catch(() => {});
    throw error;
  }
}
