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
  expected: 'The error "Incorrect PIN or password. Please try again." is shown and the clock controls do not appear. The dialog is then closed.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-CLK-003',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Continue on the location screen opens the check-in/check-out screen',
  description:
    'After the clock lifecycle and the wrong-PIN check, the location screen is shown again. Continue runs the geofence check and opens the check-in/check-out screen.',
  preconditions: 'Runs after KIOSK-CLK-002 in the same session, so the clock dialog is closed. Writes nothing.',
  steps: ['Tap Continue on the location screen (the geofence check runs)', 'Check the check-in/check-out screen opens'],
  expected: 'The "What would you like to do?" heading, the Check In and Check Out boxes, and "I\'m a new client" are shown.',
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

defineCase({
  id: 'KIOSK-CIO-001',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Check-in/check-out screen shows Check In, Check Out and New client',
  description:
    'The two action boxes and the New client button are the first things a pet owner sees once the location is chosen. The default account gets both boxes. Which box shows is set by the app profile flags, not by the role.',
  preconditions: 'Kiosk staff signed in (KIOSK_TEST_EMAIL). Default location. Writes nothing.',
  steps: ['On the select-location screen keep the default location', 'Tap Continue (the geofence check runs)', 'Read the check-in/check-out screen'],
  expected: 'The "What would you like to do?" heading, the Check In and Check Out boxes, and "I\'m a new client" are shown.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-CIO-002',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Only Check In is shown when SHOW_CHECK_OUT_KIOSK is off',
  description: 'The check-out box is hidden by the app profile flag. Check In stays visible and New client stays visible.',
  preconditions: 'A location or account whose profile sets SHOW_CHECK_OUT_KIOSK off. Not yet available. Writes nothing.',
  steps: ['Sign in with the variant account', 'Tap Continue', 'Read the check-in/check-out screen'],
  expected: 'Check In is shown. Check Out is not shown. "I\'m a new client" is shown.',
});

defineCase({
  id: 'KIOSK-CIO-003',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Only Check Out is shown when SHOW_CHECK_IN_KIOSK is off',
  description: 'The check-in box is hidden by the app profile flag. Check Out stays visible and New client stays visible.',
  preconditions: 'A location or account whose profile sets SHOW_CHECK_IN_KIOSK off. Not yet available. Writes nothing.',
  steps: ['Sign in with the variant account', 'Tap Continue', 'Read the check-in/check-out screen'],
  expected: 'Check Out is shown. Check In is not shown. "I\'m a new client" is shown.',
});

defineCase({
  id: 'KIOSK-CIO-004',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'New client stays available when both check boxes are hidden',
  description: 'With both flags off the heading and both boxes are gone, but the New client button is still on the screen.',
  preconditions: 'A location or account whose profile sets both SHOW_CHECK_IN_KIOSK and SHOW_CHECK_OUT_KIOSK off. Not yet available. Writes nothing.',
  steps: ['Sign in with the variant account', 'Tap Continue', 'Read the check-in/check-out screen'],
  expected: 'The heading, Check In and Check Out are not shown. "I\'m a new client" is shown.',
});

defineCase({
  id: 'KIOSK-HOME-001',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Visit-type screen shows Membership, Appointment, Training and Walk-in',
  description:
    'After Check In the screen lists the four visit types. A card shows only when its flag is set: SHOW_MEMBERSHIP_KIOSK, SHOW_APPOINTMENT_KIOSK, SHOW_TRAINING_KIOSK, ALLOW_WALKIN_CUSTOMER. The default account must show all four. Confirm on the first run.',
  preconditions: 'Default account with all four flags set. Writes nothing.',
  steps: ['Tap Check In', 'Read the visit-type cards'],
  expected: 'The "How are you visiting?" heading and the cards Membership, Appointment, Training and Walk-in are shown.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-HOME-002',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Continue stays unavailable until a visit type is picked',
  description: 'Until a card is selected the Continue prompt reads "Select a visit type to continue" and the contact input says "Please select a visit type first".',
  preconditions: 'On the visit-type screen with no card selected. Writes nothing.',
  steps: ['Read the Continue prompt', 'Read the contact input hint'],
  expected: '"Select a visit type to continue" is shown, and the input hint is "Please select a visit type first".',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-HOME-003',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Membership, then Continue, leaves the visit-type screen',
  description:
    'Membership check-in opens the membership path. Continue needs a contact, so the case types a generated mobile that is not a customer. Routing for each visit type needs a real customer account.',
  preconditions: 'Default account. Writes nothing.',
  steps: ['Tap Membership', 'Type a contact that is not a customer', 'Tap Continue'],
  expected: 'The "Account not found" popup is shown with its description.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-HOME-004',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Appointment, then Continue, leaves the visit-type screen',
  description:
    'Appointment check-in finds the customer\'s confirmed booking. With no booking the app shows "No confirmed appointment" instead. Continue needs a contact, so the case types a generated mobile that is not a customer. The popup is the expected result.',
  preconditions: 'Default account. Writes nothing.',
  steps: ['Tap Appointment', 'Type a contact that is not a customer', 'Tap Continue'],
  expected: 'The "Account not found" popup is shown with its description.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-HOME-005',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Training, then Continue, leaves the visit-type screen',
  description: 'Training check-in opens the training classes for the account. Continue needs a contact, so the case types a generated mobile that is not a customer. The popup is the expected result.',
  preconditions: 'Default account with the Group_Based add-on. Writes nothing.',
  steps: ['Tap Training', 'Type a contact that is not a customer', 'Tap Continue'],
  expected: 'The "Account not found" popup is shown with its description.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-HOME-006',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Walk-in, then Continue, opens the first walk-in step',
  description: 'Walk-in starts a new customer visit. Continue needs a contact, so the case types a generated mobile that is not a customer and stops at the account-not-found popup.',
  preconditions: 'Default account with ALLOW_WALKIN_CUSTOMER set. Writes nothing.',
  steps: ['Tap Walk-in', 'Type a contact that is not a customer', 'Tap Continue'],
  expected: 'The "Account not found" popup is shown with its description. No booking is made.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-HOME-007',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Back to home returns to the check-in/check-out screen',
  description: 'The "Back to home" chip on the visit-type screen goes back to the check-in/check-out screen.',
  preconditions: 'On the visit-type screen. Writes nothing.',
  steps: ['Tap Back to home'],
  expected: 'The "What would you like to do?" heading is shown.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-QR-001',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Membership QR square opens the customer QR scanner',
  description:
    'The QR square sits beside the email or mobile input. It shows only after Membership is picked, and only when the membership QR flag is on. It opens the customer QR scanner. The square has no text or key, so the test finds it by its widget type (KioskQrSquareButton).',
  preconditions: 'Default account with the membership QR flag on. Writes nothing. The camera permission may be requested the first time.',
  steps: ['Tap Membership', 'Tap the QR square', 'Check that the scanner opens'],
  expected: 'The customer QR scanner opens.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-QR-002',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Appointment QR square opens the customer QR scanner',
  description: 'The same check as KIOSK-QR-001, for Appointment and its QR flag.',
  preconditions: 'Default account with the appointment QR flag on. Writes nothing.',
  steps: ['Tap Appointment', 'Tap the QR square', 'Check that the scanner opens'],
  expected: 'The customer QR scanner opens.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-QR-003',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Typed lookup with the QA owner email finds the owner',
  description:
    'Typing an email or mobile into the input and tapping Continue looks the customer up. It runs after KIOSK-NEW-005 has created the QA owner in the same run. The expected message must come from the lookup code before this is automated.',
  preconditions: 'KIOSK-NEW-005 created the QA owner in this run (writes enabled). Expected text not yet confirmed.',
  steps: ['Tap Membership', 'Type the QA owner email', 'Tap Continue'],
  expected: 'To confirm from the membership lookup code. The owner has no membership yet.',
});

defineCase({
  id: 'KIOSK-QR-004',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'New client QR code is drawn',
  description:
    'The dialog draws the QR of the location\'s appQRLink. The content is not decoded. The test checks that a QR is drawn and that the "QR code unavailable" text is absent.',
  preconditions: 'Location with an appQRLink. Writes nothing.',
  steps: ['Tap "I\'m a new client"', 'Check the QR image in the dialog'],
  expected: 'The QR image is drawn and "QR code unavailable" is not shown.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-001',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'New client opens the QR dialog with Register Here',
  description: 'Tapping "I\'m a new client" opens the "Download our app" dialog, which has the Register Here button.',
  preconditions: 'Check-in/check-out screen. Writes nothing.',
  steps: ['Tap "I\'m a new client"'],
  expected: 'The "Download our app" dialog is shown with the "Register Here" button.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-002',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Register Here opens Add Pet Owner in create mode',
  description: 'Register Here leaves the dialog and opens the Add Pet Owner form with the create-mode fields (Email *, Create Password *).',
  preconditions: 'QR dialog open. Writes nothing.',
  steps: ['Tap Register Here'],
  expected: 'The "Add Pet Owner" screen is shown with Email * and Create Password * fields.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-003',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Empty owner form shows required-field errors',
  description: 'Saving the owner form with nothing filled in is blocked. The form stays open and nothing is saved.',
  preconditions: 'Add Pet Owner form open with no values. Writes nothing.',
  steps: ['Tap Save & Add Pet'],
  expected: 'Required-field errors are shown. The form stays open.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-004',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Invalid mobile, email and password are rejected',
  description: 'Each invalid value shows its own message on one submit. The form stays open and nothing is saved.',
  preconditions: 'Add Pet Owner form open. Writes nothing.',
  steps: [
    'Enter the mobile number 123',
    'Enter the email not-an-email',
    'Enter the password ABCDEFGH (no lowercase letter)',
    'Tap Save & Add Pet',
  ],
  expected:
    'Shown: "Enter a valid 10-digit number", "Enter a valid email" and "Password must contain at least one lowercase letter". The form stays open.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-005',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Saving a QA pet owner creates the owner and opens Add Pet',
  description:
    'Creates one owner in UAT2 with a QA name, the email dharunraj+<date><NN>@runloyal.com, a generated 000 mobile, the fixed test password (a12345678), and the first street-address suggestion. The owner is reused later for a membership purchase.',
  preconditions:
    'Run only with `npm run test:new-client:write`, after approval. Owner password is a12345678 (fixed in code). Writes one owner row to UAT2.',
  steps: [
    'Tap "I\'m a new client", then Register Here',
    'Enter the QA owner name, email, mobile and password',
    'Pick the first address suggestion',
    'Tap Save & Add Pet',
  ],
  expected: 'The owner is created and the Add Pet form opens with the "Basic Information" section.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-006',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'Empty pet form shows required-field errors',
  description: 'Needs the owner from KIOSK-NEW-005 in the same run. Adding a pet with Pet Name and Pet Type empty is blocked. Nothing is saved.',
  preconditions: 'Part of test:new-client:write. Runs straight after KIOSK-NEW-005 on the Add Pet form.',
  steps: ['Tap Add Pet with Pet Name and Pet Type empty'],
  expected: '"Please enter pet name" and "Please select pet type" are shown. No pet is saved.',
  automation: 'Automated',
});

defineCase({
  id: 'KIOSK-NEW-007',
  module: 'Kiosk',
  apps: ['kiosk'],
  scenario: 'QA pet saved, owner taps Check In, and the visit-type screen opens',
  description:
    'The pet owner never clocks in. After the pet is saved the check-in/check-out screen shows, the owner taps Check In, and the four visit types appear. Writes one pet row to UAT2.',
  preconditions: 'Part of test:new-client:write. Runs straight after KIOSK-NEW-006.',
  steps: ['Enter the QA pet name and pick the first pet type', 'Tap Add Pet', 'Tap Check In'],
  expected: 'The pet is saved. The visit-type screen shows Membership, Appointment, Training and Walk-in.',
  automation: 'Automated',
});
