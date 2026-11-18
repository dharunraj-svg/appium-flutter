import { defineCase } from '../common/support/cases.js';

defineCase({
  id: 'GROOMERS-ACC-001',
  module: 'Groomers',
  apps: ['groomers'],
  scenario: 'Account with groomer access opens the groomers app',
  description:
    'Sign-in succeeds and no access dialog appears. Positive access is covered by LOGIN-001 on this app; a dedicated check that the "Groomer Access Required" dialog is absent is still to be added.',
  preconditions: 'Staff account with hasStaffAppPlusGroomerAccess = true.',
  steps: ['Sign in to the groomers app'],
  expected: 'The login screen is dismissed. "Groomer Access Required" is not shown.',
});

defineCase({
  id: 'GROOMERS-ACC-002',
  module: 'Groomers',
  apps: ['groomers'],
  scenario: 'Account without groomer access sees "Groomer Access Required"',
  description: 'The login response has hasStaffAppPlusGroomerAccess = false. The shared LoginGate shows the access dialog.',
  preconditions: 'Staff account with hasStaffAppPlusGroomerAccess = false. Not yet available.',
  steps: ['Sign in to the groomers app with the account'],
  expected: 'The "Groomer Access Required" dialog is shown.',
});
