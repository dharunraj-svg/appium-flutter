import { existsSync, mkdirSync, readFileSync } from 'node:fs';

import ExcelJS from 'exceljs';

import { allCases } from '../cases/index.js';

const DOCS_DIR = new URL('../docs/', import.meta.url);
const SHEET_FILE = new URL('test-management.xlsx', DOCS_DIR).pathname;
const RESULTS_FILE = new URL('../logs/report/results.json', import.meta.url).pathname;

// One tab per module, plus a Summary tab with formulas over the module tabs.
const TABS = ['Common', 'Kiosk', 'Kennel', 'Groomers'];

const COLUMNS = [
  { header: 'Test Case ID', width: 16 },
  { header: 'Module', width: 11 },
  { header: 'App', width: 11 },
  { header: 'Test Scenario', width: 38 },
  { header: 'Test Description', width: 52 },
  { header: 'Preconditions', width: 40 },
  { header: 'Test Steps', width: 46 },
  { header: 'Expected Result', width: 44 },
  { header: 'Actual Result', width: 40 },
  { header: 'Test Status', width: 13 },
  { header: 'Automation Status', width: 18 },
  { header: 'Remarks', width: 36 },
  { header: 'Last Run', width: 34 },
];

const STATUS_FILL = {
  Pass: 'FFE6F4EA',
  Fail: 'FFFCE8E6',
  Pending: 'FFEEEEEE',
};

function cellText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join('');
  }
  if (typeof value === 'object' && 'text' in value) return String(value.text);
  return String(value);
}

function loadResults() {
  if (!existsSync(RESULTS_FILE)) return new Map();
  const rows = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'));
  return new Map(rows.filter((row) => row.caseId).map((row) => [`${row.caseId}|${row.app}`, row]));
}

// Remarks are written by reviewers, so they survive regeneration. They are keyed by
// case ID and app, which is one row in the sheet.
async function loadRemarks() {
  const remarks = new Map();
  if (!existsSync(SHEET_FILE)) return remarks;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SHEET_FILE);
  for (const sheet of workbook.worksheets) {
    const header = sheet.getRow(1).values;
    const idColumn = header.indexOf('Test Case ID');
    const appColumn = header.indexOf('App');
    const remarksColumn = header.indexOf('Remarks');
    if (idColumn < 1 || appColumn < 1 || remarksColumn < 1) continue;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = cellText(row.getCell(idColumn).value).trim();
      const app = cellText(row.getCell(appColumn).value).trim();
      const remark = cellText(row.getCell(remarksColumn).value).trim();
      if (id && remark) remarks.set(`${id}|${app}`, remark);
    });
  }
  return remarks;
}

function statusLabel(result) {
  if (!result) return 'Pending';
  return result.status === 'PASSED' ? 'Pass' : result.status === 'FAILED' ? 'Fail' : 'Pending';
}

function actualResult(result) {
  if (!result) return '';
  if (result.status === 'PASSED') return `Passed (${Math.round((result.durationMs ?? 0) / 1000)} s)`;
  return result.error ?? result.status;
}

function lastRun(result) {
  if (!result) return '';
  return `${result.finishedAt} · ${result.environment} · ${result.device ?? '—'}`;
}

function rowsFor(tab, cases, results, remarks) {
  const rows = [];
  for (const entry of cases.filter((item) => item.module === tab)) {
    for (const app of entry.apps) {
      const key = `${entry.id}|${app}`;
      const result = results.get(key);
      rows.push([
        entry.id,
        entry.module,
        app,
        entry.scenario,
        entry.description,
        entry.preconditions,
        entry.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
        entry.expected,
        actualResult(result),
        statusLabel(result),
        entry.automation,
        remarks.get(key) ?? '',
        lastRun(result),
      ]);
    }
  }
  return rows;
}

function styleModuleSheet(sheet) {
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B6CB0' } };
  sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const statusColumn = COLUMNS.findIndex((column) => column.header === 'Test Status') + 1;
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber === 1) return;
    const cell = row.getCell(statusColumn);
    const fill = STATUS_FILL[cell.value];
    if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
  });
}

function addSummary(workbook) {
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { header: 'Tab', key: 'tab', width: 16 },
    { header: 'Cases and apps', key: 'total', width: 16 },
    { header: 'Pass', key: 'pass', width: 10 },
    { header: 'Fail', key: 'fail', width: 10 },
    { header: 'Pending', key: 'pending', width: 10 },
    { header: 'Automated', key: 'automated', width: 12 },
    { header: 'Not Implemented', key: 'notImplemented', width: 18 },
  ];
  summary.getRow(1).font = { bold: true };

  TABS.forEach((tab) => {
    summary.addRow({
      tab,
      total: { formula: `COUNTA('${tab}'!A:A)-1` },
      pass: { formula: `COUNTIF('${tab}'!J:J,"Pass")` },
      fail: { formula: `COUNTIF('${tab}'!J:J,"Fail")` },
      pending: { formula: `COUNTIF('${tab}'!J:J,"Pending")` },
      automated: { formula: `COUNTIF('${tab}'!K:K,"Automated")` },
      notImplemented: { formula: `COUNTIF('${tab}'!K:K,"Not Implemented")` },
    });
  });
  const first = 2;
  const last = TABS.length + 1;
  const totalRow = summary.addRow({ tab: 'Total' });
  for (const key of ['total', 'pass', 'fail', 'pending', 'automated', 'notImplemented']) {
    const column = summary.getColumn(key).letter;
    totalRow.getCell(key).value = { formula: `SUM(${column}${first}:${column}${last})` };
  }
  totalRow.font = { bold: true };
  summary.addRow([]);
  summary.addRow({ tab: `Generated ${new Date().toISOString()}` });
}

async function main() {
  const cases = allCases();
  const results = loadResults();
  const remarks = await loadRemarks();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'appium-flutter';
  workbook.created = new Date();

  for (const tab of TABS) {
    const sheet = workbook.addWorksheet(tab);
    sheet.columns = COLUMNS.map((column) => ({ header: column.header, width: column.width }));
    for (const values of rowsFor(tab, cases, results, remarks)) {
      sheet.addRow(values);
    }
    styleModuleSheet(sheet);
  }
  addSummary(workbook);

  mkdirSync(DOCS_DIR, { recursive: true });
  await workbook.xlsx.writeFile(SHEET_FILE);

  const counts = TABS.map((tab) => `${tab}: ${cases.filter((c) => c.module === tab).reduce((n, c) => n + c.apps.length, 0)}`);
  console.log(`Test sheet written: ${SHEET_FILE}`);
  console.log(`Rows per tab: ${counts.join(', ')}`);
  console.log(`Results matched: ${results.size}, remarks kept: ${remarks.size}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
