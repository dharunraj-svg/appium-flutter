import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

import { allCases } from '../cases/index.js';

const REPORT_DIR = new URL('../logs/report/', import.meta.url);
const SCREENS_DIR = new URL('screens/', REPORT_DIR);
const STEPS_FILE = new URL('steps.jsonl', REPORT_DIR).pathname;
const RESULTS_FILE = new URL('results.json', REPORT_DIR).pathname;

// Run metadata comes from the workflow (or the shell). Empty values are hidden in the header.
const RUN = {
  environment: process.env.E2E_ENVIRONMENT || 'local',
  device: process.env.E2E_DEVICE || '',
  commit: (process.env.E2E_COMMIT || process.env.GITHUB_SHA || '').slice(0, 7),
  runUrl: process.env.E2E_RUN_URL || '',
};

const CASES = new Map(allCases().map((entry) => [entry.id, entry]));

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
    const key = `${record.caseId ?? record.testFile}::${record.app ?? ''}::${record.testName}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        caseId: record.caseId ?? null,
        app: record.app ?? null,
        platform: record.platform ?? null,
        testFile: record.testFile,
        testName: record.testName,
        steps: [],
        final: null,
      });
      order.push(key);
    }
    const entry = byKey.get(key);
    if (record.final) {
      entry.final = record;
    } else {
      entry.steps.push(record);
    }
  }
  return order.map((key) => summarise(byKey.get(key)));
}

function summarise(test) {
  const steps = [...test.steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const startedAt = steps[0]?.timestamp ?? test.final?.timestamp ?? null;
  const finishedAt = test.final?.timestamp ?? null;
  const durationMs = startedAt && finishedAt ? Date.parse(finishedAt) - Date.parse(startedAt) : null;

  let previous = startedAt ? Date.parse(startedAt) : null;
  const timeline = steps.map((step) => {
    const current = Date.parse(step.timestamp);
    const elapsedMs = previous === null ? 0 : current - previous;
    previous = current;
    return { ...step, elapsedMs };
  });

  return {
    ...test,
    module: test.caseId ? CASES.get(test.caseId)?.module ?? 'Unlinked' : 'Unlinked',
    status: test.final?.status ?? 'UNKNOWN',
    error: test.final?.error ?? null,
    steps: timeline,
    startedAt,
    finishedAt,
    durationMs,
  };
}

function formatDuration(ms) {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} m ${Math.round(seconds - minutes * 60)} s`;
}

function formatClock(iso) {
  return iso ? `${new Date(iso).toISOString().slice(11, 19)} UTC` : '—';
}

function imageDataUri(fileName) {
  try {
    const bytes = readFileSync(new URL(fileName, SCREENS_DIR));
    return `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

function statusClass(status) {
  if (status === 'PASSED') return 'pass';
  if (status === 'FAILED') return 'fail';
  return 'unknown';
}

function renderStep(step) {
  const uri = step.screenshot ? imageDataUri(step.screenshot) : null;
  const isFailureStep = /^failure/i.test(step.name);
  const shot = uri
    ? `<img class="shot" src="${uri}" alt="${escapeHtml(step.name)}" loading="lazy" onclick="openShot(this)">`
    : '<p class="no-shot">No screenshot for this step</p>';
  const message = step.message ? `<p class="step-message">${escapeHtml(step.message)}</p>` : '';
  const elapsed = step.elapsedMs ? `+${formatDuration(step.elapsedMs)}` : '';
  return `
    <li class="step${isFailureStep ? ' warn' : ''}">
      <div class="step-head">
        <span class="step-index">${step.stepIndex}</span>
        <span class="step-name">${escapeHtml(step.name)}</span>
        <span class="step-elapsed">${escapeHtml(elapsed)}</span>
        <span class="step-time">${escapeHtml(formatClock(step.timestamp))}</span>
      </div>
      ${message}
      ${shot}
    </li>`;
}

function renderCase(test) {
  const cls = statusClass(test.status);
  const label = test.caseId ?? 'Unlinked';
  const searchable = [test.caseId, test.module, test.app, test.testName, test.status]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const errorHtml = test.error
    ? `<div class="error">
         <div class="error-head"><span>Error</span><button type="button" class="copy" data-copy="${escapeHtml(test.error)}">Copy</button></div>
         <pre>${escapeHtml(test.error)}</pre>
       </div>`
    : '';
  const meta = [
    test.app ? `App: ${test.app}` : null,
    test.platform ? `Platform: ${test.platform}` : null,
    `Started ${formatClock(test.startedAt)}`,
    `Steps: ${test.steps.length}`,
  ]
    .filter(Boolean)
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join('');
  const open = test.status === 'FAILED' ? ' open' : '';

  return `
    <details class="case ${cls}" data-case data-status="${cls}" data-search="${escapeHtml(searchable)}"${open}>
      <summary>
        <span class="badge ${cls}">${escapeHtml(test.status)}</span>
        <span class="case-id">${escapeHtml(label)}</span>
        <span class="case-name">${escapeHtml(test.caseId && CASES.get(test.caseId) ? CASES.get(test.caseId).scenario : test.testName)}</span>
        <span class="case-duration">${escapeHtml(formatDuration(test.durationMs))}</span>
      </summary>
      <div class="case-body">
        <div class="meta">${meta}</div>
        <p class="file">${escapeHtml(test.testFile)}</p>
        ${errorHtml}
        <ol class="timeline">${test.steps.map(renderStep).join('\n')}</ol>
      </div>
    </details>`;
}

function renderReport(tests) {
  const generatedAt = new Date().toISOString();
  const passed = tests.filter((t) => t.status === 'PASSED').length;
  const failed = tests.filter((t) => t.status === 'FAILED').length;
  const other = tests.length - passed - failed;
  const totalMs = tests.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const passRate = tests.length ? Math.round((passed / tests.length) * 100) : 0;
  const apps = [...new Set(tests.map((t) => t.app).filter(Boolean))];

  const runChips = [
    `Environment: ${RUN.environment}`,
    RUN.device ? `Device: ${RUN.device}` : null,
    apps.length ? `App: ${apps.join(', ')}` : null,
    RUN.commit ? `Commit: ${RUN.commit}` : null,
  ]
    .filter(Boolean)
    .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
    .join('');
  const runLink = RUN.runUrl ? `<a class="chip link" href="${escapeHtml(RUN.runUrl)}">Open the workflow run</a>` : '';

  const cards = `
    <div class="cards">
      <div class="card"><span class="label">Cases run</span><span class="value">${tests.length}</span></div>
      <div class="card pass"><span class="label">Passed</span><span class="value">${passed}</span></div>
      <div class="card fail"><span class="label">Failed</span><span class="value">${failed}</span></div>
      <div class="card"><span class="label">Pass rate</span><span class="value">${passRate}%</span></div>
      <div class="card"><span class="label">Total time</span><span class="value">${escapeHtml(formatDuration(totalMs))}</span></div>
    </div>
    <div class="bar" aria-label="Pass, fail and other">
      <span class="seg pass" style="width:${tests.length ? (passed / tests.length) * 100 : 0}%"></span>
      <span class="seg fail" style="width:${tests.length ? (failed / tests.length) * 100 : 0}%"></span>
      <span class="seg unknown" style="width:${tests.length ? (other / tests.length) * 100 : 0}%"></span>
    </div>`;

  const toolbar = `
    <div class="toolbar">
      <div class="filters" role="group" aria-label="Filter by status">
        <button type="button" class="active" data-filter="all">All ${tests.length}</button>
        <button type="button" data-filter="pass">Passed ${passed}</button>
        <button type="button" data-filter="fail">Failed ${failed}</button>
      </div>
      <input id="search" type="search" placeholder="Search by case ID, module, app or name" aria-label="Search cases">
    </div>`;

  const body = tests.length
    ? tests.map(renderCase).join('\n')
    : '<p class="empty">No test steps were recorded in this run.</p>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Appium test report</title>
<style>
  :root {
    --bg: #f5f6f8; --card: #ffffff; --text: #1b1f24; --muted: #5f6b7a; --border: #e2e5ea;
    --pass: #137333; --pass-bg: #e6f4ea; --fail: #b3261e; --fail-bg: #fce8e6;
    --warn: #8a5a00; --warn-bg: #fff4d6; --unknown: #5f6b7a; --unknown-bg: #eceef2; --accent: #2b6cb0;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #101418; --card: #1a2028; --text: #e6e9ee; --muted: #9aa4b2; --border: #2a323d;
      --pass: #6fd08c; --pass-bg: #1d3327; --fail: #ff8a80; --fail-bg: #3b2321;
      --warn: #f2c266; --warn-bg: #3a3019; --unknown: #9aa4b2; --unknown-bg: #262d37; --accent: #7fb2ea;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; background: var(--bg); color: var(--text); font: 15px/1.45 -apple-system, system-ui, sans-serif; }
  header h1 { font-size: 1.5rem; margin: 0 0 10px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
  .chip { background: var(--card); border: 1px solid var(--border); border-radius: 999px; padding: 3px 11px; font-size: 0.82rem; color: var(--muted); text-decoration: none; }
  .chip.link { color: var(--accent); }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 12px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
  .card .label { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .card .value { font-size: 1.6rem; font-weight: 700; }
  .card.pass .value { color: var(--pass); }
  .card.fail .value { color: var(--fail); }
  .bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--unknown-bg); margin-bottom: 18px; }
  .seg.pass { background: var(--pass); }
  .seg.fail { background: var(--fail); }
  .seg.unknown { background: var(--unknown); }
  .toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .filters { display: flex; gap: 6px; }
  .filters button { font: inherit; border: 1px solid var(--border); background: var(--card); color: var(--text); padding: 6px 12px; border-radius: 999px; cursor: pointer; }
  .filters button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  #search { flex: 1 1 260px; max-width: 420px; font: inherit; padding: 7px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); }
  details.case { background: var(--card); border: 1px solid var(--border); border-left: 4px solid var(--unknown); border-radius: 12px; margin-bottom: 12px; }
  details.case.pass { border-left-color: var(--pass); }
  details.case.fail { border-left-color: var(--fail); }
  details.case[hidden] { display: none; }
  details.case > summary { list-style: none; cursor: pointer; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 16px; }
  details.case > summary::-webkit-details-marker { display: none; }
  details.case > summary::after { content: '▸'; margin-left: auto; color: var(--muted); transition: transform .15s; }
  details.case[open] > summary::after { transform: rotate(90deg); }
  .badge { font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: 999px; letter-spacing: 0.04em; }
  .badge.pass { background: var(--pass-bg); color: var(--pass); }
  .badge.fail { background: var(--fail-bg); color: var(--fail); }
  .badge.unknown { background: var(--unknown-bg); color: var(--unknown); }
  .case-id { font-family: ui-monospace, Menlo, monospace; font-weight: 600; }
  .case-name { flex: 1 1 260px; }
  .case-duration { color: var(--muted); font-family: ui-monospace, Menlo, monospace; font-size: 0.85rem; margin-right: 18px; }
  .case-body { padding: 0 16px 16px; border-top: 1px solid var(--border); }
  .meta { display: flex; flex-wrap: wrap; gap: 6px 14px; color: var(--muted); font-size: 0.82rem; margin: 12px 0 4px; }
  .file { color: var(--muted); font-family: ui-monospace, Menlo, monospace; font-size: 0.78rem; margin: 0 0 10px; }
  .error { border: 1px solid var(--fail); background: var(--fail-bg); border-radius: 8px; margin: 10px 0 14px; overflow: hidden; }
  .error-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; color: var(--fail); font-weight: 600; font-size: 0.85rem; }
  .error pre { margin: 0; padding: 10px 12px; white-space: pre-wrap; word-break: break-word; font: 0.82rem/1.4 ui-monospace, Menlo, monospace; color: var(--text); }
  .copy { font: inherit; font-size: 0.78rem; border: 1px solid var(--fail); background: transparent; color: var(--fail); border-radius: 6px; padding: 2px 9px; cursor: pointer; }
  ol.timeline { list-style: none; margin: 12px 0 0; padding: 0 0 0 14px; border-left: 2px solid var(--border); display: flex; flex-direction: column; gap: 14px; }
  .step { position: relative; }
  .step::before { content: ''; position: absolute; left: -21px; top: 6px; width: 10px; height: 10px; border-radius: 50%; background: var(--pass); }
  .step.warn::before { background: var(--warn); }
  .step-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .step-index { background: var(--unknown-bg); color: var(--muted); border-radius: 999px; padding: 0 7px; font-size: 0.74rem; font-weight: 700; }
  .step-name { font-weight: 600; }
  .step.warn .step-name { color: var(--warn); }
  .step-elapsed { color: var(--accent); font-size: 0.78rem; font-family: ui-monospace, Menlo, monospace; }
  .step-time { color: var(--muted); font-size: 0.74rem; font-family: ui-monospace, Menlo, monospace; margin-left: auto; }
  .step-message { color: var(--muted); font-size: 0.85rem; margin: 2px 0 6px; }
  .shot { display: block; width: 200px; max-width: 100%; border-radius: 8px; border: 1px solid var(--border); cursor: zoom-in; }
  .no-shot { color: var(--muted); font-size: 0.8rem; font-style: italic; margin: 0; }
  dialog#shot { border: none; padding: 0; background: transparent; max-width: 96vw; max-height: 94vh; }
  dialog#shot::backdrop { background: rgba(0, 0, 0, 0.75); }
  dialog#shot img { display: block; max-width: 96vw; max-height: 94vh; border-radius: 10px; }
  .empty { color: var(--muted); }
  @media (max-width: 600px) { body { padding: 16px; } .case-duration { margin-right: 0; } .step-time { margin-left: 0; } }
</style>
</head>
<body>
<header>
  <h1>Appium test report</h1>
  <div class="chips">${runChips}${runLink}<span class="chip">Generated ${escapeHtml(formatClock(generatedAt))}</span></div>
</header>
${cards}
${toolbar}
<main>
${body}
</main>
<dialog id="shot" aria-label="Screenshot"><img alt="Screenshot"></dialog>
<script>
  const filterButtons = document.querySelectorAll('[data-filter]');
  const search = document.getElementById('search');
  const state = { filter: 'all', query: '' };

  function applyFilters() {
    document.querySelectorAll('[data-case]').forEach((el) => {
      const statusOk = state.filter === 'all' || el.dataset.status === state.filter;
      const queryOk = !state.query || el.dataset.search.includes(state.query);
      el.hidden = !(statusOk && queryOk);
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      filterButtons.forEach((other) => other.classList.toggle('active', other === button));
      applyFilters();
    });
  });

  search.addEventListener('input', () => {
    state.query = search.value.trim().toLowerCase();
    applyFilters();
  });

  function openShot(img) {
    const dialog = document.getElementById('shot');
    dialog.querySelector('img').src = img.src;
    dialog.showModal();
  }

  const dialog = document.getElementById('shot');
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }
    });
  });
</script>
</body>
</html>`;
}

function resultsFor(tests) {
  return tests.map((test) => ({
    caseId: test.caseId,
    module: test.module,
    app: test.app,
    platform: test.platform,
    testFile: test.testFile,
    testName: test.testName,
    status: test.status,
    startedAt: test.startedAt,
    finishedAt: test.finishedAt,
    durationMs: test.durationMs,
    steps: test.steps.length,
    error: test.error,
    environment: RUN.environment,
    device: RUN.device || null,
    commit: RUN.commit || null,
  }));
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
  writeFileSync(RESULTS_FILE, `${JSON.stringify(resultsFor(tests), null, 2)}\n`, 'utf8');

  // Screenshots are embedded in the HTML above, so the loose PNGs are
  // intermediate artifacts. Remove them to avoid unbounded disk growth.
  for (const record of records) {
    if (record.screenshot) {
      try {
        unlinkSync(new URL(record.screenshot, SCREENS_DIR));
      } catch {
        // already gone or never written — fine either way
      }
    }
  }

  // Clear step data for the next run.
  writeFileSync(STEPS_FILE, '', 'utf8');

  console.log(`Report written: ${reportPath}`);
  console.log(`Latest report:  ${latestPath}`);
  console.log(`Results:        ${RESULTS_FILE}`);
}

main();
