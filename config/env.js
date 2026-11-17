export function readEnv(name, source = process.env) {
  const value = source[name];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

export function requireEnv(names, source = process.env) {
  const missing = names.filter((name) => readEnv(name, source) === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`,
    );
  }
  return Object.fromEntries(names.map((name) => [name, readEnv(name, source)]));
}

export function readAppiumConfig(source = process.env) {
  return {
    host: readEnv('APPIUM_HOST', source)?.trim() ?? '127.0.0.1',
    port: Number(readEnv('APPIUM_PORT', source) ?? 4723),
  };
}

export function readDeviceConfig(source = process.env) {
  return {
    name: readEnv('IOS_DEVICE_NAME', source)?.trim() ?? 'iPad mini (A17 Pro)',
    udid: readEnv('IOS_UDID', source)?.trim(),
  };
}

export function readAndroidDeviceConfig(source = process.env) {
  return {
    // UiAutomator2 doesn't match deviceName against a real catalog the way
    // iOS does — any non-empty string is fine. The udid (adb serial)
    // defaults to the standard first-emulator serial, which is what
    // reactivecircus/android-emulator-runner and `emulator -avd ...` both
    // produce when only one emulator is running.
    name: readEnv('ANDROID_DEVICE_NAME', source)?.trim() ?? 'Android Emulator',
    udid: readEnv('ANDROID_UDID', source)?.trim() ?? 'emulator-5554',
  };
}

export function readSimulatorLocation(source = process.env) {
  const values = requireEnv(['KIOSK_SIM_LATITUDE', 'KIOSK_SIM_LONGITUDE'], source);
  return {
    latitude: Number(values.KIOSK_SIM_LATITUDE),
    longitude: Number(values.KIOSK_SIM_LONGITUDE),
  };
}
