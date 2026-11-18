# appium-flutter

Appium (Flutter driver) end-to-end tests for the RunLoyal kiosk app, on iOS (local simulator)
and Android (local emulator or a GitHub-hosted one in CI). On Android the sign-in check also runs
against the StaffApp Plus kennel and groomers apps.

## Prerequisites

- Appium running on port 4723 (`appium`). The `flutter` driver must be installed (`appium driver list --installed`).
- A booted iOS simulator. List them with `xcrun simctl list devices`.
- A debug simulator build of the kiosk app. Release builds cannot be driven by the Flutter driver.

  ```bash
  cd /Users/runloyal/RunLoyal/Flutter/kiosk-turbo/staff-turbo-flutter/apps/kiosk
  flutter build ios --simulator --debug
  ```

## Setup

```bash
cd /Users/runloyal/RunLoyal/Flutter/appium/appium-flutter
npm install
cp .env.example .env   # then fill in the test accounts and the simulator location
```

## Run on your machine: `npm run test:local`

One command runs the whole suite for one app on your own simulator or emulator:

```bash
cd /Users/runloyal/RunLoyal/Flutter/appium/appium-flutter
npm run test:local
```

It asks two questions, then does the rest:

1. **Platform**: `1) iOS simulator` or `2) Android emulator`.
2. **App**: `1) RunLoyal Front Desk Kiosk`, `2) StaffApp Plus for Kennel` or `3) StaffApp Plus for Groomers`.

For the kiosk it also asks you to confirm, because the clock tests write real clock-in rows to the
environment in `.env`.

Then it:

- finds the debug build (`.app` for iOS, `.apk` for Android) in the Flutter checkout, or runs
  `flutter build` for it if it is missing;
- boots the simulator or starts the emulator if none is running;
- starts Appium if it is not already running;
- runs the matching suite: the kiosk iOS or Android suite, or the shared staff sign-in check for
  kennel and groomers;
- rebuilds `logs/report/latest.html` and `docs/test-management.xlsx`, then opens the report.

Skip the questions with flags, or check the plan without running anything:

```bash
npm run test:local -- --platform android --app groomers --yes
npm run test:local -- --platform ios --app kennel --dry-run
npm run test:local -- --platform ios --app groomers --rebuild   # rebuild even if a build exists
```

Other flags: `--no-open` keeps the report from opening. Source folders default to the Flutter
checkouts; override them with `KIOSK_SOURCE_DIR`, `KENNEL_SOURCE_DIR` or `GROOMERS_SOURCE_DIR`.
Optional: `ANDROID_AVD` picks which emulator to start.

Requirements: the `.env` file (see Setup), Xcode for iOS, the Android SDK with an AVD for Android,
and `flutter` and `appium` on your PATH.

## Commands

| Command | What it does |
| --- | --- |
| `npm run test:local` | Interactive: pick a platform and an app, then run that suite end to end on your machine. See "Run on your machine" above. |
| `npm run doctor` | Checks Appium, the booted simulator, and that one session can start and reach the Sign in button. Writes a screenshot to `logs/`. |
| `npm test` | **The one to run normally.** One Appium session for the whole suite: one app install, one login, then login / clock-in-break-out / wrong-credentials run back to back reusing it. Faster than reinstalling per test, since only the first check needs the app to actually launch from scratch. |
| `npm run test:separate-sessions` | The old shape — each check gets its own fresh install and its own login, sequentially (`--test-concurrency=1` so they don't fight over the simulator). Slower; use it if you suspect one check is leaking state into the next and want to rule that out. |
| `npm run test:login` | Just the login check, on its own fresh install. |
| `npm run test:clock-in` | Just the clock lifecycle (Start Shift → Start Break → End Break → End Shift), on its own fresh install. Writes real timesheets, so run it only against UAT. |
| `npm run test:clock-in-wrong-credentials` | Just the wrong-PIN rejection check, on its own fresh install. Writes nothing — rejected at authentication. |
| `npm run report` | Rebuilds `logs/report/latest.html` from whatever step data is currently recorded, without running any test. Rarely needed by hand — every `test*` script already runs this at the end automatically. |
| `npm run test:android` | The Android counterpart of `npm test` — one shared session, same three checks, against `TARGET_APP=kiosk-android`. See "Running on Android" below. |
| `npm run test:android:login` | The shared sign-in checks, against whichever app `TARGET_APP` names. LOGIN-001 runs on every app; LOGIN-004 (biometric setup sheet) runs on kennel and groomers only (`kennel`, `groomers`, `kennel-android`, `groomers-android`, `kiosk`, `kiosk-android`). |

`tests/kiosk/suite.test.js` is what `npm test` runs — it opens one session in a `before` hook and
closes it in `after`, and the three checks are `test()`s inside that one `describe`, reusing the
same `driver`. The flows (`loginAsKioskStaff`, `clockInAndOut`,
`attemptClockInWithWrongCredentials`) don't assume a fresh launch — each one picks up from
wherever the app currently is — so they compose cleanly whether they're running in their own
fresh session or chained in the shared one. The three original `tests/kiosk/*.test.js` files
are unchanged and still fully independent, for when you want to debug exactly one check without
the others in the way.

Every `test*` script writes a detailed HTML report after it finishes, **pass or fail** — open
`logs/report/latest.html` in a browser. It's a single self-contained file: one section per
test, a screenshot at each major step, and the full error for anything that failed. (We looked
at `appium-reporter-plugin` for this first — it only supports Appium `^2.4.1`, and nothing
newer has been published since January 2024, so it can't run against this project's Appium
3.9.0. This is a small in-house equivalent instead: no new dependency, no server restart, and
nothing leaves your machine.)

## Layout

```
config/
  env.js            reads and validates environment values, iOS and Android device config
  apps.js           app registry — "kiosk" (iOS) and "kiosk-android". TARGET_APP selects one.
  users.js          test accounts, read from environment variables only
  capabilities.js   builds iOS or Android capabilities, dispatched by the selected app's platform
  index.js          loadSuiteConfig(): one entry point for tests
common/
  support/          session open/close; simulator.js (iOS, xcrun simctl) and android.js (adb) each
                    do GPS mocking + screenshots their own way; device.js dispatches between them
                    by platform so flow code doesn't need to care which OS it's on; report.js is
                    the step recorder for the HTML report
  pages/            locators and actions for each screen
  flows/            reusable steps: kiosk login, the clock lifecycle, the wrong-credential check —
                    each takes an optional `recorder` to log a step + screenshot
tests/kiosk/        kiosk tests. They compose the common flows. android-suite.test.js is the
                    Android counterpart of suite.test.js.
tests/shared/       checks on the shared sign-in, on iOS and Android. staff-login.test.js signs in with
                    the shared staff login (kennel, groomers, and the kiosk) and, on kennel and groomers,
                    checks the biometric setup sheet (LOGIN-004).
scripts/
  doctor.js         environment and session check
  build-report.js   turns recorded steps into logs/report/latest.html, then clears them
logs/report/        steps.jsonl (working data, cleared after each build), latest.html, and
                    timestamped report-*.html files. All git-ignored.
.github/workflows/  android-e2e.yml — runs the Android suite on a GitHub-hosted emulator.
```

Keep locators in `common/pages/`. Tests call flows only, so a UI change touches one file.

## The clock-in lifecycle

`employee_clock_dialog.dart`'s `_buildClockControls` has three mutually exclusive states:

| State | Buttons shown |
| --- | --- |
| Not started | Start Shift |
| Active, not on break | Start Break, End Shift |
| On break | End Break |

Every one of the four actions runs the app's location check (`_checkLocation`) before it does
anything else — none of them skip it. **Ending a shift closes the dialog entirely** and pops
back to the location-select screen; it does not reset to "Start Shift" within the same dialog.
`kiosk-clock.flow.js` accounts for this: it waits for the location screen to reappear after the
final `endShift()`, not for a button inside a now-closed dialog.

Wrong credential: a bad email or PIN is handled by the same code path (there's no separate
"user not found" branch), and the one message confirmed by an existing unit test
(`packages/logic/test/api/employee_clock_auth_test.dart`) is:

```
Incorrect PIN or password. Please try again.
```

`clock-in-wrong-credentials.test.js` uses the real employee email with a deliberately wrong PIN
(never read from `.env`, so a typo there can't make the test silently pass) and asserts this
exact text.

## Running on Android

The same page objects, flows, and tests drive Android too — only the device layer differs.
`appium:autoGrantPermissions` replaces the iOS TCC dance entirely (no permission prompt to race
against), and GPS mocking uses `adb emu geo fix` instead of `xcrun simctl location`.

### Locally

```bash
# 1. Build a debug APK
cd /Users/runloyal/RunLoyal/Flutter/kiosk-turbo/staff-turbo-flutter/apps/kiosk
flutter build apk --debug

# 2. Install the drivers this needs, if you haven't already
appium driver install uiautomator2
appium driver install --source=npm appium-flutter-driver

# 3. Boot an emulator (create one first with Android Studio or avdmanager if you don't have one)
emulator -avd <your_avd_name>
adb devices   # confirm it shows up, e.g. emulator-5554

# 4. Point .env at it, then run
cd /Users/runloyal/RunLoyal/Flutter/appium/appium-flutter
# in .env: TARGET_APP=kiosk-android, KIOSK_APK_PATH=.../apps/kiosk/build/app/outputs/flutter-apk/app-debug.apk
npm run test:android
```

**Not yet run against a real emulator.** Everything above the emulator layer — the config
(`kiosk-android` app entry, Android capabilities with `autoGrantPermissions`), the adb-based
helpers (`common/support/android.js`), and `tests/kiosk/android-suite.test.js` — is written and
syntax-checked, and offline config construction is verified, but no Android system image was
available locally to boot an emulator and prove the full run end to end the way the iOS suite
was. Treat the first real run as the actual verification, and expect to fix at least the small
things real devices always surface (an extra permission dialog, slightly different timing).

### In CI (GitHub Actions)

`.github/workflows/android-e2e.yml` boots a GitHub-hosted Android emulator
(`reactivecircus/android-emulator-runner`), downloads a debug APK from a URL you provide, and
runs `npm run test:android` (kiosk) or `npm run test:android:login` (kennel, groomers) against it —
no source checkout, no Flutter build, in CI at all. That's deliberate: `staff-turbo-flutter` lives on Bitbucket, not GitHub, so there's no
GitHub PR to trigger off; wherever the APK actually gets built hands this workflow a URL instead.

**To use it, once this project is pushed to a GitHub repo:**

1. Trigger it manually — Actions tab → "Kiosk Android E2E" → "Run workflow":
   - `apk_url`: a direct download link to the debug APK. Required for kennel and groomers. The kiosk
     falls back to the `KIOSK_APK_URL` repository secret when this is blank (a stable "latest build"
     URL works well there).
   - `app`: "RunLoyal Frontend Desk KIOSK", "StaffApp Plus for Kennel" or "StaffApp Plus for Groomers".
     Every app runs the shared sign-in check. Only the kiosk also runs the clock-in and wrong-PIN checks.
   - `device_type`: `mobile` (Pixel 6) or `tablet` (Pixel Tablet).
   - `target_environment`: `UAT2` or `PROD`. PROD runs write real clock-in rows.
2. For each environment you run against (**UAT2**, and **PROD** if needed), create it and add these as environment **secrets**:
   `KIOSK_TEST_EMAIL`, `KIOSK_TEST_PASSWORD`, `KIOSK_EMPLOYEE_EMAIL`,
   `KIOSK_EMPLOYEE_PASSWORD_OR_PIN`, `KIOSK_SIM_LATITUDE`, `KIOSK_SIM_LONGITUDE`. The job runs
   with the chosen environment, so these are read from it. `KIOSK_APK_URL` (optional,
   see above) stays a repository secret.
3. The HTML report and any failure screenshots upload as a build artifact on every run
   (`if: always()`), downloadable from the run's summary page.

To trigger it automatically from wherever the APK gets built — a Bitbucket Pipeline, Codemagic,
etc. — have that system call `gh workflow run android-e2e.yml -f apk_url=<url>` (needs a GitHub
token with Actions write access) once the build finishes, instead of relying on a push trigger
this repo can't receive.

**Kennel and groomers need a new build.** Their debug APKs must come from code that includes the
Flutter driver hook: `enableFlutterDriverExtension()` in `apps/kennel/lib/main.dart` and
`apps/groomers/lib/main.dart`, the `flutter_driver` dependency in their pubspecs, and the
`staff_login_*` keys in `packages/staff_app_ui/lib/screens/login/login_gate.dart`. Those changes are
in `staff-turbo-flutter` and are not committed yet. An APK built before them has no driver to attach
to, so sign-in will time out.

**Not yet run.** The YAML is written and validated as well-formed YAML, and every step reuses
commands already proven locally in this session (the exact `appium driver install` calls, the
`appium --log-level error` + poll-`/status` startup check, `npm run test:android`) — but it has
not executed on an actual GitHub Actions runner, because that needs this project pushed to a
GitHub repo first, which needs your decision on where (see below).

## Environment

See `.env.example`. Credentials live only in `.env`, which is git-ignored.

- `KIOSK_APP_PATH` is the iOS debug build path; `KIOSK_APK_PATH` is the Android debug APK path (for `TARGET_APP=kiosk-android`). Each app entry gets its own path variable: `KENNEL_APK_PATH` for `kennel-android` and `GROOMERS_APK_PATH` for `groomers-android`.
- `KIOSK_TEST_EMAIL` and `KIOSK_TEST_PASSWORD` are the kiosk staff login.
- `KIOSK_EMPLOYEE_EMAIL` and `KIOSK_EMPLOYEE_PASSWORD_OR_PIN` are the clock-in account.
- `KIOSK_SIM_LATITUDE` and `KIOSK_SIM_LONGITUDE` must sit inside the test location's geofence. The clock-in test sets them on the simulator. Not needed for the wrong-credentials test — it's rejected before any location check runs.

## Notes and gotchas

- **Text entry needs a `Key`.** The Flutter driver can't reliably focus a field by label or
  semantics — the fields and buttons this suite drives all have explicit `Key`s added in
  `apps/kiosk/lib/screens/login/login_screen.dart` and
  `apps/kiosk/lib/screens/select_location/widgets/employee_clock_dialog.dart`. The shared staff
  login in `packages/staff_app_ui/lib/screens/login/login_gate.dart` uses `staff_login_*` keys, which
  kennel and groomers both get. Any new interactive element needs the same before a test can target it.
- **The biometric setup sheet is found by its label.** After a sign-in, kennel and groomers can open a
  sheet that offers Face ID or fingerprint sign-in. It has no `Key` yet, so
  `common/pages/biometric-setup.page.js` finds its "Skip for now" button by text. The sign-in flow closes
  the sheet before it waits for the login screen to go, because the login screen stays mounted behind
  it. The sheet only appears when the device has Face ID or a fingerprint enrolled and biometric login
  is off. When it does not appear, the flow carries on without it, and LOGIN-004 fails with a clear
  message. A `Key` on that button in `staff_app_ui` would let the page object use it instead.
- **Frame sync is off while the biometric sheet is open.** The Sign in button keeps spinning behind the
  sheet, and Flutter Driver's frame-synced waits never finish while an animation runs. The sign-in flow
  turns frame sync off (`flutter:setFrameSync`) for the sign-in window and turns it back on afterwards.
- **Reading on-screen text needs the actual `Text` widget, not a wrapper.** The Flutter driver's
  `getText` command only works on a `Text`/`RichText`/`EditableText` element — a `Key` on a
  composite container (like the error banners here) can't be read directly. Target the `Text`
  descendant instead: `descendant({ of: containerFinder, matching: byType('Text'), firstMatchOnly: true })`.
- **The webdriverio method is `getElementText`, not `getText`.** The appium-flutter-driver
  README's own examples use `driver.getText(el)`, but that method doesn't exist on this
  webdriverio v10 client — use `driver.getElementText(el)`.
- **`appium:autoAcceptAlerts` is set**, because the first launch shows an iOS notification
  prompt that hides the app from the driver.
- **Location permission is granted after `openSession()`, not before.** Appium reinstalls the
  app for every session (`appium:noReset` is false), and an iOS reinstall wipes any previously
  granted TCC permission for that bundle id — granting it before the app is installed gets
  silently undone.
- Each run reinstalls the app, so every test starts clean.
