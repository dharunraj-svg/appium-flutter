export function buildSimulatorCapabilities({ app, device }) {
  return {
    platformName: 'iOS',
    'appium:automationName': 'Flutter',
    'appium:deviceName': device.name,
    ...(device.udid ? { 'appium:udid': device.udid } : {}),
    'appium:app': app.appPath,
    'appium:noReset': false,
    'appium:autoAcceptAlerts': true,
    'appium:newCommandTimeout': 180,
  };
}

export function buildAndroidCapabilities({ app, device }) {
  return {
    platformName: 'Android',
    'appium:automationName': 'Flutter',
    'appium:deviceName': device.name,
    ...(device.udid ? { 'appium:udid': device.udid } : {}),
    'appium:app': app.appPath,
    'appium:appPackage': app.appPackage,
    'appium:noReset': false,
    // Android's equivalent of iOS's TCC permission dance: grants every
    // permission the app's manifest declares at install time, so there's no
    // runtime permission prompt (and no native-dialog race) to handle at all.
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 180,
  };
}

export function buildCapabilities({ app, device }) {
  return app.platform === 'android'
    ? buildAndroidCapabilities({ app, device })
    : buildSimulatorCapabilities({ app, device });
}
