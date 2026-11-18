import { defineCase } from '../common/support/cases.js';

defineCase({
  id: 'KENNEL-ACC-001',
  module: 'Kennel',
  apps: ['kennel'],
  scenario: 'Account with kennel access opens the kennel app',
  description:
    'Sign-in succeeds and no access dialog appears. Positive access is covered by LOGIN-001 on this app; a dedicated check that the "Kennel Access Required" dialog is absent is still to be added.',
  preconditions: 'Staff account with hasStaffAppPlusKennelAccess = true.',
  steps: ['Sign in to the kennel app'],
  expected: 'The login screen is dismissed. "Kennel Access Required" is not shown.',
});

defineCase({
  id: 'KENNEL-ACC-002',
  module: 'Kennel',
  apps: ['kennel'],
  scenario: 'Account without kennel access sees "Kennel Access Required"',
  description: 'The login response has hasStaffAppPlusKennelAccess = false. The shared LoginGate shows the access dialog.',
  preconditions: 'Staff account with hasStaffAppPlusKennelAccess = false. Not yet available.',
  steps: ['Sign in to the kennel app with the account'],
  expected: 'The "Kennel Access Required" dialog is shown.',
});
