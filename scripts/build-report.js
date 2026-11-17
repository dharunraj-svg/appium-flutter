import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

const REPORT_DIR = new URL('../logs/report/', import.meta.url);
const SCREENS_DIR = new URL('screens/', REPORT_DIR);
const STEPS_FILE = new URL('steps.jsonl', REPORT_DIR).pathname;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readSteps() {
  if (!existsSync(STEPS_FILE)) return [];
  const raw = readFileSync(STEPS_FILE, 'utf8').trim();
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function groupByTest(records) {
  const order = [];
  const byKey = new Map();
  for (const record of records) {
    const key = `${record.testFile}::${record.testName}`;
    if (!byKey.has(key)) {
      byKey.set(key, { testFile: record.testFile, testName: record.testName, steps: [], final: null });
      order.push(key);
    }
    const entry = byKey.get(key);
    if (record.final) {
      entry.final = record;
    } else {
      entry.steps.push(record);
    }
  }
  return order.map((key) => byKey.get(key));
}

function imageDataUri(fileName) {
  try {
    const bytes = readFileSync(new URL(fileName, SCREENS_DIR));
    return `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

function renderTest(test) {
  const status = test.final?.status ?? 'UNKNOWN';
  const statusClass = status === 'PASSED' ? 'pass' : status === 'FAILED' ? 'fail' : 'unknown';
  const errorHtml = test.final?.error
    ? `<p class="error">${escapeHtml(test.final.error)}</p>`
    : '';

  const stepsHtml = test.steps
    .map((step) => {
      const uri = imageDataUri(step.screenshot);
      const img = uri ? `<img src="${uri}" alt="${escapeHtml(step.name)}" loading="lazy">` : '<p class="no-shot">(no screenshot)</p>';
      const message = step.message ? `<p class="step-message">${escapeHtml(step.message)}</p>` : '';
      return `
        <li class="step">
          <div class="step-head">
            <span class="step-index">${step.stepIndex}</span>
            <span class="step-name">${escapeHtml(step.name)}</span>
            <span class="step-time">${escapeHtml(step.timestamp)}</span>
          </div>
          ${message}
          ${img}
        </li>`;
    })
    .join('\n');

  return `
    <section class="test ${statusClass}">
      <h2>
        <span class="badge ${statusClass}">${escapeHtml(status)}</span>
        ${escapeHtml(test.testName)}
      </h2>
      <p class="test-file">${escapeHtml(test.testFile)}</p>
      ${errorHtml}
      <ol class="steps">${stepsHtml}</ol>
    </section>`;
}

function renderReport(tests) {
  const generatedAt = new Date().toISOString();
  const passCount = tests.filter((t) => t.final?.status === 'PASSED').length;
  const failCount = tests.filter((t) => t.final?.status === 'FAILED').length;

  const body = tests.length
    ? tests.map(renderTest).join('\n')
    : '<p class="empty">No test steps were recorded.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Kiosk Appium Report — ${escapeHtml(generatedAt)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 24px; background: #f6f7f9; color: #1a1a1a; }
  header { margin-bottom: 24px; }
  h1 { font-size: 1.4rem; margin: 0 0 8px; }
  .summary { display: flex; gap: 16px; font-size: 0.95rem; }
  .summary span.pass { color: #137333; font-weight: 600; }
  .summary span.fail { color: #c5221f; font-weight: 600; }
  .test { background: #fff; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .test.fail { border-left: 4px solid #c5221f; }
  .test.pass { border-left: 4px solid #137333; }
  .test h2 { font-size: 1.05rem; margin: 0 0 4px; display: flex; align-items: center; gap: 10px; }
  .badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 999px; letter-spacing: 0.03em; }
  .badge.pass { background: #e6f4ea; color: #137333; }
  .badge.fail { background: #fce8e6; color: #c5221f; }
  .badge.unknown { background: #eee; color: #555; }
  .test-file { color: #666; font-size: 0.8rem; margin: 0 0 10px; font-family: ui-monospace, monospace; }
  .error { background: #fce8e6; color: #7a1a15; padding: 8px 12px; border-radius: 6px; font-family: ui-monospace, monospace; font-size: 0.85rem; white-space: pre-wrap; }
  ol.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .step { border: 1px solid #e3e3e6; border-radius: 8px; padding: 10px 12px; }
  .step-head { display: flex; align-items: baseline; gap: 10px; font-size: 0.85rem; margin-bottom: 6px; }
  .step-index { background: #eee; border-radius: 999px; padding: 1px 7px; font-weight: 700; font-size: 0.75rem; }
  .step-name { font-weight: 600; }
  .step-time { color: #888; font-size: 0.75rem; margin-left: auto; font-family: ui-monospace, monospace; }
  .step-message { color: #444; font-size: 0.85rem; margin: 4px 0; }
  .step img { max-width: 420px; width: 100%; border-radius: 6px; border: 1px solid #ddd; }
  .no-shot { color: #999; font-size: 0.8rem; font-style: italic; }
  .empty { color: #666; }
</style>
</head>
<body>
<header>
  <h1>Kiosk Appium Test Report</h1>
  <div class="summary">
    <span>Generated ${escapeHtml(generatedAt)}</span>
    <span class="pass">${passCount} passed</span>
    <span class="fail">${failCount} failed</span>
  </div>
</header>
${body}
</body>
</html>`;
}

function main() {
  const records = readSteps();
  const tests = groupByTest(records);
  const html = renderReport(tests);

  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = new URL(`report-${stamp}.html`, REPORT_DIR).pathname;
  const latestPath = new URL('latest.html', REPORT_DIR).pathname;

  writeFileSync(reportPath, html, 'utf8');
  writeFileSync(latestPath, html, 'utf8');

  // Screenshots are now embedded in the HTML above, so the loose PNGs are
  // pure intermediate artifacts — remove them to avoid unbounded disk growth.
  for (const record of records) {
    if (record.screenshot) {
      try {
        unlinkSync(new URL(record.screenshot, SCREENS_DIR));
      } catch {
        // already gone or never written — fine either way
      }
    }
  }

  // Clear step data for the next run, same as the plugin's deleteReportData.
  writeFileSync(STEPS_FILE, '', 'utf8');

  console.log(`Report written: ${reportPath}`);
  console.log(`Latest report:  ${latestPath}`);
}

main();
