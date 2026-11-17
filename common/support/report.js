import { appendFileSync, mkdirSync } from 'node:fs';
import { screenshot } from './simulator.js';

const REPORT_DIR = new URL('../../logs/report/', import.meta.url);
const SCREENS_DIR = new URL('screens/', REPORT_DIR);
const STEPS_FILE = new URL('steps.jsonl', REPORT_DIR).pathname;

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

function appendRecord(record) {
  mkdirSync(REPORT_DIR, { recursive: true });
  appendFileSync(STEPS_FILE, `${JSON.stringify(record)}\n`, 'utf8');
}

// No-op recorder — used by anything that doesn't pass a real one, so
// reporting stays optional everywhere it's threaded through.
const noopRecorder = {
  async step() {},
  async finish() {},
};

export function createStepRecorder({ testFile, testName, udid }) {
  if (!udid) return noopRecorder;

  mkdirSync(SCREENS_DIR, { recursive: true });
  const testSlug = slug(`${testFile}-${testName}`);
  let stepIndex = 0;

  return {
    async step(name, { message } = {}) {
      stepIndex += 1;
      const shotName = `${testSlug}-${String(stepIndex).padStart(2, '0')}-${slug(name)}.png`;
      const shotPath = new URL(shotName, SCREENS_DIR).pathname;
      await screenshot(udid, shotPath).catch(() => {});
      appendRecord({
        testFile,
        testName,
        stepIndex,
        name,
        message: message ?? null,
        screenshot: shotName,
        timestamp: new Date().toISOString(),
      });
    },

    async finish(status, error) {
      appendRecord({
        testFile,
        testName,
        final: true,
        status, // 'PASSED' | 'FAILED'
        error: error ? String(error.message ?? error) : null,
        timestamp: new Date().toISOString(),
      });
    },
  };
}
