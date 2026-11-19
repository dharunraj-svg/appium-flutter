// Visibility checks that return true/false instead of throwing. A Flutter
// finder that is not found within the timeout throws; these turn that into a
// boolean so a flow can branch on what is actually on screen.

export async function isVisible(driver, finder, timeoutMs = 1_000) {
  try {
    await driver.execute('flutter:waitFor', finder, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

export async function isAbsent(driver, finder, timeoutMs = 1_000) {
  try {
    await driver.execute('flutter:waitForAbsent', finder, timeoutMs);
    return true;
  } catch {
    return false;
  }
}

export function waitForVisible(driver, finder, timeoutMs) {
  return driver.execute('flutter:waitFor', finder, timeoutMs);
}
