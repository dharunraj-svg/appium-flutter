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
  // same staff_login_* keys. Bundle ids and applicationIds come from each app's
  // ios/Runner.xcodeproj and android/app/build.gradle.kts. They also show the
  // biometric setup sheet after sign-in (biometricSetupPrompt).
  kennel: {
    displayName: 'StaffApp Plus for Kennel',
    platform: 'ios',
    bundleId: 'com.itrustkennel.staffapp.plus.kennel',
    appPathVariable: 'KENNEL_APP_PATH',
    loginKeyPrefix: 'staff_login',
    biometricSetupPrompt: true,
  },
  groomers: {
    displayName: 'StaffApp Plus for Groomers',
    platform: 'ios',
    bundleId: 'com.itrustkennel.staffapp.plus',
    appPathVariable: 'GROOMERS_APP_PATH',
    loginKeyPrefix: 'staff_login',
    biometricSetupPrompt: true,
  },
  'kennel-android': {
    displayName: 'StaffApp Plus for Kennel (Android)',
    platform: 'android',
    appPackage: 'com.itrustkennel.staffapp.plus.kennel',
    appPathVariable: 'KENNEL_APK_PATH',
    loginKeyPrefix: 'staff_login',
    biometricSetupPrompt: true,
  },
  'groomers-android': {
    displayName: 'StaffApp Plus for Groomers (Android)',
    platform: 'android',
    appPackage: 'com.itrustkennel.staffapp.plus',
    appPathVariable: 'GROOMERS_APK_PATH',
    loginKeyPrefix: 'staff_login',
    biometricSetupPrompt: true,
  },
};

export const SUPPORTED_APPS = Object.keys(APPS);

export function hasBiometricSetup(name = process.env.TARGET_APP?.trim() || 'kiosk') {
  return APPS[name]?.biometricSetupPrompt === true;
}

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
