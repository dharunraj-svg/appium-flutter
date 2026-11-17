import { execFile } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { promisify } from 'node:util';

import { byText } from 'appium-flutter-finder';
import { remote } from 'webdriverio';

const run = promisify(execFile);

const host = process.env.APPIUM_HOST || '127.0.0.1';
const port = Number(process.env.APPIUM_PORT || 4723);
const udid = process.env.IOS_UDID || '94970434-01EC-4BD1-8BE4-18D2E22F3EEC';
const deviceName = process.env.IOS_DEVICE_NAME || 'iPad mini (A17 Pro)';
const app =
  process.env.KIOSK_APP_PATH ||
  '/Users/runloyal/RunLoyal/Flutter/kiosk-turbo/staff-turbo-flutter/apps/kiosk/build/ios/iphonesimulator/Runner.app';

const describe = (error) => {
  const cause = error.cause ? ` | cause: ${error.cause.message ?? error.cause}` : '';
  return `${error.message}${cause}`;
};

async function checkAppium() {
  try {
    const response = await fetch(`http://${host}:${port}/status`);
    const body = await response.json();
    console.log(`appium ready: ${body.value?.ready}`);
  } catch (error) {
    console.log(`appium NOT reachable: ${describe(error)}`);
    process.exitCode = 1;
    throw error;
  }
}

async function checkSimulator() {
  const { stdout } = await run('xcrun', ['simctl', 'list', 'devices', 'booted']);
  const booted = stdout.split('\n').filter((line) => line.includes('(Booted)'));
  console.log(booted.length ? `booted simulators:\n${booted.join('\n')}` : 'no simulator booted');
  if (!booted.some((line) => line.includes(udid))) {
    console.log(`warning: UDID ${udid} is not booted`);
  }
}

async function main() {
  await checkAppium();
  await checkSimulator();

  let driver;
  try {
    driver = await remote({
      hostname: host,
      port,
      path: '/',
      logLevel: 'warn',
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'Flutter',
        'appium:deviceName': deviceName,
        'appium:udid': udid,
        'appium:app': app,
        'appium:noReset': false,
        'appium:autoAcceptAlerts': true,
        'appium:newCommandTimeout': 180,
      },
    });
    console.log(`session created: ${driver.sessionId}`);
    const shot = new URL('../logs/doctor-start.png', import.meta.url).pathname;
    await mkdir(new URL('../logs/', import.meta.url), { recursive: true });
    await run('xcrun', ['simctl', 'io', udid, 'screenshot', shot]);
    console.log(`screenshot saved: ${shot}`);
  } catch (error) {
    console.log(`session FAILED: ${describe(error)}`);
    process.exitCode = 1;
    return;
  }

  try {
    await driver.execute('flutter:waitFor', byText('Sign in'), 60_000);
    console.log('Sign in button visible');
  } catch (error) {
    console.log(`Sign in wait FAILED: ${describe(error)}`);
    process.exitCode = 1;
  } finally {
    await driver.deleteSession().catch((error) => console.log(`delete failed: ${describe(error)}`));
  }
}

main().catch(() => {});
