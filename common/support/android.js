import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);

function adbArgs(deviceId, args) {
  return deviceId ? ['-s', deviceId, ...args] : args;
}

// Android's `emu geo fix` takes LONGITUDE first, then LATITUDE — the
// opposite order from how coordinates are normally written and from this
// project's {latitude, longitude} shape. Swapping them silently places the
// emulator on the wrong side of the globe instead of erroring.
export async function setEmulatorLocation(deviceId, { latitude, longitude }) {
  await run('adb', adbArgs(deviceId, ['emu', 'geo', 'fix', String(longitude), String(latitude)]));
}

export async function screenshot(deviceId, outPath) {
  const { stdout } = await run('adb', adbArgs(deviceId, ['exec-out', 'screencap', '-p']), {
    encoding: 'buffer',
    maxBuffer: 50 * 1024 * 1024,
  });
  await writeFile(outPath, stdout);
}

export async function dumpLogcat(deviceId, outPath) {
  const { stdout } = await run('adb', adbArgs(deviceId, ['logcat', '-d', '-v', 'time']), {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
  await writeFile(outPath, stdout);
}

const NOT_RESPONDING = /isn(?:'|&apos;)t responding/;

// On a busy emulator a system app (the launcher, for example) can freeze and raise
// an "isn't responding" dialog that covers the app under test. Tapping "Wait" keeps
// it running and gives input back. Returns true when a dialog was dismissed.
export async function dismissNotRespondingDialog(deviceId) {
  const { stdout } = await run('adb', adbArgs(deviceId, ['shell', 'uiautomator', 'dump', '/dev/tty']), {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 15_000,
  });
  if (!NOT_RESPONDING.test(stdout)) return false;

  const waitNode = stdout.split('<node ').find((node) => /text="Wait"/.test(node));
  const bounds = waitNode?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!bounds) return false;

  const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
  await run(
    'adb',
    adbArgs(deviceId, ['shell', 'input', 'tap', String(Math.round((x1 + x2) / 2)), String(Math.round((y1 + y2) / 2))]),
  );
  return true;
}
