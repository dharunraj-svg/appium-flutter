import { defineCase } from '../common/support/cases.js';

const ALL_APPS = ['kiosk', 'kennel', 'groomers'];

defineCase({
  id: 'LOGIN-001',
  module: 'Common',
  apps: ALL_APPS,
  scenario: 'Staff signs in with valid credentials and leaves the login screen',
  description:
    'A staff account with access to the app signs in. Kennel and groomers share LoginGate; the kiosk has its own login screen.',
  preconditions: 'Test staff account (KIOSK_TEST_EMAIL / KIOSK_TEST_PASSWORD). Simulated location inside the geofence.',
  steps: ['Open the app to the login screen', 'Enter the staff email and password', 'Tap Sign in'],
  expected: 'The login screen is dismissed and the app moves on to its next screen.',
  automation: 'Automated',
});

defineCase({
  id: 'LOGIN-002',
  module: 'Common',
  apps: ALL_APPS,
  scenario: 'Wrong password is rejected on the staff login',
  description: 'A valid email with a wrong password must not sign in. The exact error text is to be confirmed from the logic package before it is asserted.',
  preconditions: 'Test staff email. A password that is deliberately wrong.',
  steps: ['Enter the staff email and a wrong password', 'Tap Sign in'],
  expected: 'The login screen stays visible and an error is shown.',
});

defineCase({
  id: 'LOGIN-003',
  module: 'Common',
  apps: ALL_APPS,
  scenario: 'Empty email or password is blocked by validation',
  description: 'Submitting with a blank field must not call the sign-in API.',
  preconditions: 'None.',
  steps: ['Leave the email or password blank', 'Tap Sign in'],
  expected: 'Validation message is shown and the login screen stays visible.',
});

defineCase({
  id: 'LOGIN-004',
  module: 'Common',
  apps: ['kennel', 'groomers'],
  scenario: 'Biometric setup prompt after sign-in can be skipped',
  description:
    'After the first valid sign-in, kennel and groomers offer biometric sign-in in a sheet with an Enable switch, Done and "Skip for now". Skip for now closes the sheet without turning biometric login on, and the app opens its home screen. The case fails if the sheet does not appear, which means the device has no Face ID or fingerprint enrolled, or biometric login is already on. Every other sign-in in the suite passes through this sheet too.',
  preconditions:
    'Test staff account with kennel or groomer access. Face ID or a fingerprint enrolled on the device, and biometric login off for it. Simulated location inside the geofence.',
  steps: [
    'Open the app to the login screen',
    'Enter the staff email and password',
    'Tap Sign in',
    'On the biometric setup sheet, tap Skip for now',
  ],
  expected:
    'The biometric setup sheet is shown. After Skip for now the sheet closes, the login screen is dismissed and the home screen is shown.',
  automation: 'Automated',
});

defineCase({
  id: 'LOGIN-005',
  module: 'Common',
  apps: ['kennel', 'groomers'],
  scenario: 'Biometric sign-in can be turned on from the setup sheet',
  description:
    'Turning on the Enable switch asks the device to confirm Face ID or a fingerprint. A confirmed match turns biometric login on, and the next sign-in does not show the sheet. Done closes the sheet the same way Skip for now does, so the switch is what decides whether biometric login is on. Not automated yet: the device has to confirm a match, which the suite cannot do.',
  preconditions:
    'Face ID or a fingerprint enrolled on the device, and biometric login off. A face or finger the device accepts.',
  steps: [
    'Sign in until the biometric setup sheet is shown',
    'Turn on the Enable switch',
    'Confirm the Face ID or fingerprint prompt with a match',
    'Tap Done',
    'Sign in again on the next launch',
  ],
  expected:
    'The switch stays on after the match. Done closes the sheet and the home screen is shown. The next sign-in does not show the biometric setup sheet.',
});
