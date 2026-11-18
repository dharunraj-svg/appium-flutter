import { defineCase } from '../common/support/cases.js';

defineCase({
  id: 'KIOSK-CLK-001',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Employee clocks in, starts and ends a break, and clocks out',
  description:
    'The full shift cycle from the kiosk clock dialog: Start Shift, Start Break, End Break, End Shift. Each action runs the location check first.',
  preconditions:
    'Staff signed in on the kiosk. Employee account (KIOSK_EMPLOYEE_EMAIL / KIOSK_EMPLOYEE_PASSWORD_OR_PIN) starts clocked out. Writes real timesheet rows to the environment.',
  steps: [
    'Open Staff Clock-In/Out',
    'Authenticate as the employee',
    'Tap Start Shift',
    'Tap Start Break, then End Break',
    'Tap End Shift',
  ],
  expected: 'Each state change shows the next set of buttons. The dialog closes after End Shift.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-CLK-002',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Wrong employee PIN is rejected on the clock-in dialog',
  description: 'A wrong PIN for a real employee email must show the legacy error and must not reach the clock controls.',
  preconditions: 'Employee email from KIOSK_EMPLOYEE_EMAIL. A PIN that is deliberately wrong. Writes nothing.',
  steps: ['Open Staff Clock-In/Out', 'Enter the employee email and a wrong PIN', 'Tap Continue'],
  expected: 'The error "Incorrect PIN or password. Please try again." is shown and the clock controls do not appear.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-ACC-001',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Account without kiosk access cannot clock in on the kiosk',
  description: 'The login response has hasKioskAccess = false. The expected kiosk behaviour must be confirmed from the code before it is asserted.',
  preconditions: 'A staff account with hasKioskAccess = false. Not yet available.',
  steps: ['Sign in on the kiosk with the account'],
  expected: 'To confirm from the kiosk login code.',
});
