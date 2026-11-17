import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export async function setSimulatorLocation(udid, { latitude, longitude }) {
  await run('xcrun', ['simctl', 'location', udid ?? 'booted', 'set', `${latitude},${longitude}`]);
}

// Grants "while using the app" location permission for bundleId before the app ever
// launches, so iOS never shows its native location prompt. That prompt sits outside
// the Flutter engine's semantics tree, so the Flutter driver cannot see or dismiss it
// reliably (autoAcceptAlerts can race with the app's own permission-denied fallback UI
// and leave both stacked on screen, blocking every subsequent driver command).
export async function grantLocationPermission(udid, bundleId) {
  await run('xcrun', ['simctl', 'privacy', udid ?? 'booted', 'grant', 'location', bundleId]);
}

export async function screenshot(udid, outPath) {
  await run('xcrun', ['simctl', 'io', udid ?? 'booted', 'screenshot', outPath]);
}
