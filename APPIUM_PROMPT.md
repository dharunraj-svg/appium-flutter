# Appium Automation: Prompt for AI Agents

## Context

Read `APPIUM_CONTEXT.md` in this repository first. It defines the architecture, the test case model,
the sheet and the report.

Apps under test (read-only references):

- kiosk: `/Users/runloyal/RunLoyal/Flutter/kiosk-turbo/staff-turbo-flutter/apps/kiosk`
- kennel: `/Users/runloyal/RunLoyal/Flutter/staff-turbo-flutter/apps/kennel`
- groomers: `/Users/runloyal/RunLoyal/Flutter/staff-turbo-flutter/apps/groomers`

## Task

For the module named in the request:

1. Review the existing implementation: screens, widgets, `Key`s, business rules and API calls.
2. List the positive, negative, boundary and error cases that the implementation supports. Do not
   assume behaviour the code does not show.
3. Add each case to `cases/<module>.cases.js` with a unique ID.
4. Implement the automation in `tests/`, using `caseTest()`, the existing flows and pages. Add new
   `Key`s to the app only when a test needs one, and say so.
5. Run the affected tests. Record only what they actually produced.
6. Run `npm run sheet` and check the workbook.
7. Update `APPIUM_CONTEXT.md` and its diagrams if the structure changed.

## Rules

- Do not create a separate test sheet. The workbook at `docs/test-management.xlsx` is the only one.
- Do not mark an unexecuted case as passed.
- Do not change working app behaviour to make a test pass. Report the defect instead.
- Clock actions write real rows to UAT2. Ask before running them. Never run them on PROD.
- Keep the existing suites working. Run `node --check` on every changed JavaScript file.

## Output

End with: the cases added or changed, the results of each run, the defects found, and what is still
pending or blocked (for example, missing accounts or the driver hook).
