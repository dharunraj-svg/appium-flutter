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
