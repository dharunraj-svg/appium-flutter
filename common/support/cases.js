import { test } from 'node:test';

const ID_PATTERN = /^[A-Z]+(?:-[A-Z]+)*-\d{3}$/;
const MODULES = ['Common', 'Kiosk', 'Kennel', 'Groomers'];
const APPS = ['kiosk', 'kennel', 'groomers'];

const registry = new Map();

// Registers one test case. A case is the unit the review sheet lists: one row per
// case and app. Duplicate or malformed IDs fail at load time, not in the sheet.
export function defineCase(definition) {
  const { id, module, apps, scenario } = definition;
  if (!ID_PATTERN.test(id)) throw new Error(`Invalid test case ID "${id}". Use <MODULE>-<NNN>.`);
  if (registry.has(id)) throw new Error(`Duplicate test case ID "${id}".`);
  if (!MODULES.includes(module)) throw new Error(`Case ${id} has unknown module "${module}".`);
  if (!Array.isArray(apps) || apps.length === 0 || apps.some((app) => !APPS.includes(app))) {
    throw new Error(`Case ${id} must list apps from: ${APPS.join(', ')}.`);
  }
  if (!scenario) throw new Error(`Case ${id} needs a scenario.`);

  const entry = Object.freeze({
    description: '',
    preconditions: '',
    steps: [],
    expected: '',
    automation: 'Not Implemented',
    ...definition,
  });
  registry.set(id, entry);
  return entry;
}

export function getCase(id) {
  const entry = registry.get(id);
  if (!entry) throw new Error(`Unknown test case ID "${id}". Define it in cases/ first.`);
  return entry;
}

export function allCases() {
  return [...registry.values()];
}

// A node:test test whose name carries the case ID, so the console output and the
// report both show which case ran.
export function caseTest(id, options, body) {
  const definition = getCase(id);
  return test(`${id} ${definition.scenario}`, options, body);
}
