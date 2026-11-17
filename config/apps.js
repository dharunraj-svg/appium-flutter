import { readEnv } from './env.js';

const APPS = {
  kiosk: {
    displayName: 'RunLoyal Front Desk Kiosk',
    platform: 'ios',
    bundleId: 'com.itrustkennel.runloyalfrontdesk',
    appPathVariable: 'KIOSK_APP_PATH',
    loginKeyPrefix: 'kiosk_login',
  },
  'kiosk-android': {
    displayName: 'RunLoyal Front Desk Kiosk (Android)',
    platform: 'android',
    // Same applicationId as the iOS bundle id — confirmed in
    // apps/kiosk/android/app/build.gradle.kts.
    appPackage: 'com.itrustkennel.runloyalfrontdesk',
    appPathVariable: 'KIOSK_APK_PATH',
    loginKeyPrefix: 'kiosk_login',
  },
  // Kennel and groomers share LoginGate from staff_app_ui, so they carry the
  // same staff_login_* keys. Their applicationIds are from
  // apps/kennel and apps/groomers android/app/build.gradle.kts.
  'kennel-android': {
    displayName: 'StaffApp Plus for Kennel (Android)',
    platform: 'android',
    appPackage: 'com.itrustkennel.staffapp.plus.kennel',
    appPathVariable: 'KENNEL_APK_PATH',
    loginKeyPrefix: 'staff_login',
  },
  'groomers-android': {
    displayName: 'StaffApp Plus for Groomers (Android)',
    platform: 'android',
    appPackage: 'com.itrustkennel.staffapp.plus',
    appPathVariable: 'GROOMERS_APK_PATH',
    loginKeyPrefix: 'staff_login',
  },
};

export const SUPPORTED_APPS = Object.keys(APPS);

export function selectApp(source = process.env) {
  const name = readEnv('TARGET_APP', source)?.trim() ?? 'kiosk';
  const definition = APPS[name];
  if (!definition) {
    throw new Error(
      `TARGET_APP "${name}" is not configured yet. Supported apps: ${SUPPORTED_APPS.join(', ')}.`,
    );
  }

  const appPath = readEnv(definition.appPathVariable, source)?.trim();
  if (!appPath) {
    const buildHint = definition.platform === 'android' ? 'debug APK' : 'debug simulator build';
    throw new Error(`${definition.appPathVariable} is not set. Point it at the ${buildHint} of the ${name} app.`);
  }

  return { name, platform: 'ios', ...definition, appPath };
}
