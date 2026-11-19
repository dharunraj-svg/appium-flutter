#!/usr/bin/env node
// Local end-to-end runner. Asks for a platform and an app, builds the debug app if it is
// missing, starts the device and Appium if they are not running, runs the matching suite,
// then rebuilds the report and the test sheet and opens the report.
//
//   npm run test:local
//   npm run test:local -- --platform android --app groomers --yes
//   npm run test:local -- --platform ios --app kennel --dry-run   (prints the plan only)

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Flutter checkouts the debug builds come from. Override with KIOSK_SOURCE_DIR,
// KENNEL_SOURCE_DIR or GROOMERS_SOURCE_DIR in the shell if a checkout moves.
const APPS = {
  kiosk: {
    label: 'RunLoyal Front Desk Kiosk',
    sourceDir: '/Users/runloyal/RunLoyal/Flutter/kiosk-turbo/staff-turbo-flutter/apps/kiosk',
  },
  kennel: {
    label: 'StaffApp Plus for Kennel',
    sourceDir: '/Users/runloyal/RunLoyal/Flutter/staff-turbo-flutter/apps/kennel',
  },
  groomers: {
    label: 'StaffApp Plus for Groomers',
    sourceDir: '/Users/runloyal/RunLoyal/Flutter/staff-turbo-flutter/apps/groomers',
  },
};

const PLATFORM_CHOICES = { 1: 'ios', 2: 'android', ios: 'ios', android: 'android' };
const APP_CHOICES = { 1: 'kiosk', 2: 'kennel', 3: 'groomers', kiosk: 'kiosk', kennel: 'kennel', groomers: 'groomers' };

function parseArgs(argv) {
  const options = { platform: null, app: null, yes: false, dryRun: false, open: true, rebuild: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [flag, inline] = arg.split('=');
    const next = () => inline ?? argv[(index += 1)];
    if (flag === '--platform') options.platform = PLATFORM_CHOICES[String(next()).toLowerCase()];
    else if (flag === '--app') options.app = APP_CHOICES[String(next()).toLowerCase()];
    else if (flag === '--yes' || flag === '-y') options.yes = true;
    else if (flag === '--dry-run') options.dryRun = true;
    else if (flag === '--no-open') options.open = false;
    else if (flag === '--rebuild') options.rebuild = true;
    else throw new Error(`Unknown option "${arg}". Use --platform, --app, --yes, --dry-run or --no-open.`);
  }
  if (options.platform === undefined || options.app === undefined) {
    throw new Error('Platform must be ios or android, and app must be kiosk, kennel or groomers.');
  }
  return options;
}

// Reads answers from the lines of stdin. Iterating the lines keeps answers that arrive
// before a question is asked, so piped input works as well as a terminal.
function makeAsker() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();
  return {
    async ask(prompt) {
      process.stdout.write(prompt);
      const { value, done } = await lines.next();
      if (done) throw new Error('No answer was given, so nothing was run.');
      return value;
    },
    close() {
      rl.close();
    },
  };
}

async function askChoice(ask, title, options, prompt) {
  console.log(`\n${title}`);
  options.forEach((option, index) => console.log(`  ${index + 1}) ${option.label}`));
  for (;;) {
    const answer = (await ask(prompt)).trim().toLowerCase();
    const picked = options.find((option, index) => answer === String(index + 1) || answer === option.value);
    if (picked) return picked.value;
    console.log(`Please enter a number from 1 to ${options.length}.`);
  }
}

function resolveTarget(appKey, platform) {
  const app = APPS[appKey];
  const envPrefix = appKey.toUpperCase();
  const sourceDir = process.env[`${envPrefix}_SOURCE_DIR`] || app.sourceDir;
  const isAndroid = platform === 'android';
  return {
    appKey,
    label: app.label,
    platform,
    sourceDir,
    targetApp: isAndroid ? `${appKey}-android` : appKey,
    pathVariable: isAndroid ? `${envPrefix}_APK_PATH` : `${envPrefix}_APP_PATH`,
    udidVariable: isAndroid ? 'ANDROID_UDID' : 'IOS_UDID',
    artifact: isAndroid
      ? join(sourceDir, 'build/app/outputs/flutter-apk/app-debug.apk')
      : join(sourceDir, 'build/ios/iphonesimulator/Runner.app'),
    buildArgs: isAndroid ? ['build', 'apk', '--debug'] : ['build', 'ios', '--simulator', '--debug'],
    testFile:
      appKey === 'kiosk'
        ? isAndroid
          ? 'tests/kiosk/android-suite.test.js'
          : 'tests/kiosk/suite.test.js'
        : 'tests/shared/staff-login.test.js',
  };
}

function ensureBuild(target, options) {
  const command = `flutter ${target.buildArgs.join(' ')}`;
  if (existsSync(target.artifact) && !options.rebuild) return;
  if (options.dryRun) {
    console.log(`  Build ${options.rebuild ? 'requested' : 'missing'}. Would run "${command}" in ${target.sourceDir}`);
    return;
  }
  if (!existsSync(target.sourceDir)) {
    throw new Error(`Source folder not found: ${target.sourceDir}. Set ${target.appKey.toUpperCase()}_SOURCE_DIR.`);
  }
  console.log(`\nBuilding with "${command}" in ${target.sourceDir} ...`);
  const result = spawnSync('flutter', target.buildArgs, { cwd: target.sourceDir, stdio: 'inherit' });
  if (result.status !== 0 || !existsSync(target.artifact)) {
    throw new Error(`The build failed or did not produce ${target.artifact}.`);
  }
}

function sdkRoot() {
  return process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || join(homedir(), 'Library/Android/sdk');
}

function runningEmulators() {
  const output = spawnSync('adb', ['devices'], { encoding: 'utf8' }).stdout ?? '';
  return output
    .split('\n')
    .map((line) => line.trim().match(/^(emulator-\d+)\s+device$/)?.[1])
    .filter(Boolean);
}

async function ensureAndroidDevice(options) {
  const running = runningEmulators();
  if (running.length > 0) return running[0];
  if (options.dryRun) return 'emulator-5554 (would start an emulator)';

  const emulatorBin = join(sdkRoot(), 'emulator', 'emulator');
  if (!existsSync(emulatorBin)) throw new Error(`No Android emulator is running, and ${emulatorBin} was not found.`);
  const avds = (spawnSync(emulatorBin, ['-list-avds'], { encoding: 'utf8' }).stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const avd = process.env.ANDROID_AVD || avds[0];
  if (!avd) throw new Error('No Android virtual device exists. Create one in Android Studio (Device Manager).');

  console.log(`\nNo emulator is running. Starting ${avd} ...`);
  spawn(emulatorBin, ['-avd', avd, '-memory', '4096', '-no-snapshot-save'], { detached: true, stdio: 'ignore' }).unref();

  const deadline = Date.now() + 5 * 60_000;
  while (Date.now() < deadline) {
    const serial = runningEmulators()[0];
    if (serial) {
      const booted = spawnSync('adb', ['-s', serial, 'shell', 'getprop', 'sys.boot_completed'], { encoding: 'utf8' });
      if ((booted.stdout ?? '').trim() === '1') return serial;
    }
    await sleep(3_000);
  }
  throw new Error('The emulator did not finish booting within 5 minutes.');
}

function simulators(state) {
  const output = spawnSync('xcrun', ['simctl', 'list', 'devices', state, '-j'], { encoding: 'utf8' }).stdout ?? '{}';
  const devices = JSON.parse(output).devices ?? {};
  return Object.values(devices).flat();
}

async function ensureIosDevice(options) {
  const booted = simulators('booted').filter((device) => device.state === 'Booted');
  const preferred = booted.find((device) => device.udid === process.env.IOS_UDID) ?? booted[0];
  if (preferred) return preferred.udid;
  if (options.dryRun) return `${process.env.IOS_UDID ?? 'first available iPhone'} (would boot a simulator)`;

  const candidates = simulators('available').filter((device) => device.isAvailable !== false);
  const pick =
    candidates.find((device) => device.name === process.env.IOS_DEVICE_NAME) ??
    candidates.find((device) => device.name.startsWith('iPhone')) ??
    candidates[0];
  if (!pick) throw new Error('No iOS simulator is available. Create one in Xcode (Settings > Platforms).');

  console.log(`\nNo simulator is booted. Booting ${pick.name} ...`);
  spawnSync('xcrun', ['simctl', 'boot', pick.udid]);
  spawnSync('open', ['-a', 'Simulator']);
  const deadline = Date.now() + 3 * 60_000;
  while (Date.now() < deadline) {
    if (simulators('booted').some((device) => device.udid === pick.udid)) return pick.udid;
    await sleep(2_000);
  }
  throw new Error(`${pick.name} did not boot within 3 minutes.`);
}

function appiumUrl() {
  const host = process.env.APPIUM_HOST || '127.0.0.1';
  const port = process.env.APPIUM_PORT || '4723';
  return `http://${host}:${port}`;
}

async function appiumReady() {
  try {
    const response = await fetch(`${appiumUrl()}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

// Starts Appium when it is not already running. Returns the child to stop afterwards,
// or null when Appium was already running and should be left alone.
async function ensureAppium(options) {
  if (await appiumReady()) return null;
  if (options.dryRun) return null;
  console.log('\nAppium is not running. Starting it on the default port ...');
  const child = spawn('appium', ['--log-level', 'error'], { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await appiumReady()) return child;
    await sleep(1_000);
  }
  child.kill('SIGTERM');
  throw new Error('Appium did not start within 60 seconds. Install it with "npm i -g appium" and start it manually.');
}

function runSuite(target, env) {
  const result = spawnSync(process.execPath, ['--env-file-if-exists=.env', '--test', target.testFile], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

function rebuildReports() {
  spawnSync(process.execPath, [join(ROOT, 'scripts/build-report.js')], { cwd: ROOT, stdio: 'inherit' });
  spawnSync(process.execPath, [join(ROOT, 'scripts/build-test-sheet.js')], { cwd: ROOT, stdio: 'inherit' });
}

function openReport() {
  spawnSync('open', [join(ROOT, 'logs/report/latest.html')]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let platform = options.platform;
  let appKey = options.app;

  if (!platform || !appKey) {
    const asker = makeAsker();
    try {
      platform ??= await askChoice(
        asker.ask,
        'Which platform do you want to test?',
        [
          { label: 'iOS simulator', value: 'ios' },
          { label: 'Android emulator', value: 'android' },
        ],
        'Choose 1 or 2: ',
      );
      appKey ??= await askChoice(
        asker.ask,
        'Which app do you want to test?',
        [
          { label: APPS.kiosk.label, value: 'kiosk' },
          { label: APPS.kennel.label, value: 'kennel' },
          { label: APPS.groomers.label, value: 'groomers' },
        ],
        'Choose 1, 2 or 3: ',
      );
      if (appKey === 'kiosk' && !options.yes && !options.dryRun) {
        const answer = (
          await asker.ask('\nThe kiosk suite writes real clock-in rows to the environment in .env. Continue? [y/N] ')
        )
          .trim()
          .toLowerCase();
        if (answer !== 'y' && answer !== 'yes') {
          console.log('Cancelled.');
          return 0;
        }
      }
    } finally {
      asker.close();
    }
  }

  const target = resolveTarget(appKey, platform);
  console.log(`\nApp:      ${target.label}`);
  console.log(`Platform: ${platform === 'ios' ? 'iOS simulator' : 'Android emulator'}`);
  console.log(`Suite:    ${target.testFile}`);
  console.log(`Build:    ${target.artifact} ${existsSync(target.artifact) ? '(found)' : '(missing)'}`);

  ensureBuild(target, options);
  const udid = platform === 'android' ? await ensureAndroidDevice(options) : await ensureIosDevice(options);
  const appium = await ensureAppium(options);

  const env = {
    ...process.env,
    TARGET_APP: target.targetApp,
    [target.pathVariable]: target.artifact,
    [target.udidVariable]: udid,
    E2E_DEVICE: `${platform === 'android' ? 'Android emulator' : 'iOS simulator'} ${udid}`,
    E2E_ENVIRONMENT: 'local',
  };

  if (options.dryRun) {
    console.log(`\nDry run. Would run: node --env-file-if-exists=.env --test ${target.testFile}`);
    console.log(`  TARGET_APP=${target.targetApp}  ${target.pathVariable}=${target.artifact}  ${target.udidVariable}=${udid}`);
    return 0;
  }

  let code = 1;
  try {
    console.log(`\nRunning ${target.testFile} ...\n`);
    code = runSuite(target, env);
  } finally {
    if (appium) appium.kill('SIGTERM');
    rebuildReports();
    if (options.open) openReport();
  }
  return code;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  });
