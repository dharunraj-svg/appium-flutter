// Thin platform dispatcher so flow code can stay platform-agnostic instead
// of importing an iOS- or Android-only module directly. iOS's module
// (simulator.js) is untouched and keeps its own names (setSimulatorLocation,
// grantLocationPermission) for the existing iOS tests that already import it
// by those names — this facade is additive, not a replacement.
import * as android from './android.js';
import * as ios from './simulator.js';

export async function setLocation(platform, deviceId, location) {
  if (platform === 'android') {
    await android.setEmulatorLocation(deviceId, location);
  } else {
    await ios.setSimulatorLocation(deviceId, location);
  }
}

export async function takeScreenshot(platform, deviceId, outPath) {
  if (platform === 'android') {
    await android.screenshot(deviceId, outPath);
  } else {
    await ios.screenshot(deviceId, outPath);
  }
}
