/** The Apps Script from Code.gs as a string, so the setup dialog can offer a Copy button. Keep both in sync. */
export const TOKEN_PLACEHOLDER = "CHANGE-ME-to-a-long-random-string";

export const APPS_SCRIPT = `/**
 * POS storage for Google Sheets.
 * Paste into the sheet's Extensions > Apps Script, change TOKEN, then Deploy > New deployment > Web app
 * (Execute as: Me, Who has access: Anyone). Paste the /exec link and the same TOKEN into POS Settings.
 * Tabs are created automatically: Items, Sales, SaleLines, Readings, Outbox.
 */
const TOKEN = "CHANGE-ME-to-a-long-random-string";
const ALLOWED = ["Items", "Sales", "SaleLines", "Readings", "Outbox"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const req = JSON.parse(e.postData.contents);
    if (req.token !== TOKEN) return out({ ok: false, error: "Wrong token" });
    if (req.action === "ping") return out({ ok: true, sheet: SpreadsheetApp.getActiveSpreadsheet().getName() });
    if (req.action === "load") return out({ ok: true, sheets: loadAll() });
    if (req.action === "batch") { applyBatch(req.ops || []); return out({ ok: true }); }
    return out({ ok: false, error: "Unknown action" });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  if (ALLOWED.indexOf(name) < 0) throw new Error("Unknown sheet: " + name);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function cell(v) {
  return v instanceof Date ? v.toISOString() : String(v);
}

function loadAll() {
  const result = {};
  ALLOWED.forEach(function (name) {
    const sh = getSheet(name);
    const lr = sh.getLastRow(), lc = sh.getLastColumn();
    if (lr < 2 || lc < 1) { result[name] = []; return; }
    const vals = sh.getRange(1, 1, lr, lc).getValues();
    const head = vals[0].map(String);
    result[name] = vals.slice(1).map(function (r) {
      const o = {};
      head.forEach(function (h, i) { o[h] = cell(r[i]); });
      return o;
    });
  });
  return result;
}

/** Reads a tab's header and an id -> row number index once per request. */
function ctx(cache, name) {
  if (cache[name]) return cache[name];
  const sh = getSheet(name);
  const lc = sh.getLastColumn();
  const head = lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : [];
  const last = Math.max(sh.getLastRow(), 1);
  const rowOf = {};
  const idCol = head.indexOf("id") + 1;
  if (idCol > 0 && last > 1) {
    sh.getRange(2, idCol, last - 1, 1).getValues().forEach(function (r, i) { rowOf[String(r[0])] = i + 2; });
  }
  cache[name] = { sh: sh, head: head, rowOf: rowOf, last: last };
  return cache[name];
}

function applyBatch(ops) {
  const cache = {};

  // 1) Check uniqueness (e.g. invoice number) before writing anything, so a rejected batch changes nothing.
  ops.forEach(function (op) {
    if (op.op !== "put" || !op.unique) return;
    const c = ctx(cache, op.sheet);
    const ci = c.head.indexOf("id"), cu = c.head.indexOf(op.unique);
    if (ci < 0 || cu < 0 || c.last < 2) return;
    const vals = c.sh.getRange(2, 1, c.last - 1, c.head.length).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (cell(vals[i][cu]) === String(op.row[op.unique]) && cell(vals[i][ci]) !== String(op.row.id)) {
        throw new Error(op.unique + " " + op.row[op.unique] + " already exists in " + op.sheet);
      }
    }
  });

  // 2) Apply.
  ops.forEach(function (op) {
    const c = ctx(cache, op.sheet);
    if (op.op === "put") putRow(c, op.row);
    else if (op.op === "del") delRow(c, String(op.id));
    else throw new Error("Unknown op");
  });
  SpreadsheetApp.flush();
}

function putRow(c, row) {
  // Add any columns this tab doesn't have yet (this also writes the header row on first use).
  Object.keys(row).forEach(function (k) {
    if (c.head.indexOf(k) >= 0) return;
    c.head.push(k);
    if (c.sh.getMaxColumns() < c.head.length) c.sh.insertColumnsAfter(c.sh.getMaxColumns(), c.head.length - c.sh.getMaxColumns());
    const h = c.sh.getRange(1, c.head.length);
    h.setNumberFormat("@");
    h.setValue(k);
  });

  const id = String(row.id);
  const existing = c.rowOf[id];
  var r = existing;
  if (!r) { r = ++c.last; c.rowOf[id] = r; }

  const rng = c.sh.getRange(r, 1, 1, c.head.length);
  rng.setNumberFormat("@"); // keep "00000012", dates and numbers as plain text
  const cur = existing ? rng.getValues()[0] : [];
  rng.setValues([c.head.map(function (k, i) {
    if (row[k] !== undefined) return String(row[k]);
    return cur[i] === undefined ? "" : cell(cur[i]); // keep columns you added by hand
  })]);
}

function delRow(c, id) {
  const r = c.rowOf[id];
  if (!r) return;
  c.sh.deleteRow(r);
  delete c.rowOf[id];
  Object.keys(c.rowOf).forEach(function (k) { if (c.rowOf[k] > r) c.rowOf[k]--; });
  c.last--;
}
`;