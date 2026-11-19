// Flutter driver waits for frame sync before every command. A repeating animation or
// a spinner never settles, so every later command hangs. Frame sync is turned off only
// on screens that keep animating (the QR scanner, the owner and pet forms).

const FRAME_SYNC_TIMEOUT_MS = 5_000;

export function setFrameSync(driver, enabled) {
  return driver.execute('flutter:setFrameSync', enabled, FRAME_SYNC_TIMEOUT_MS);
}
