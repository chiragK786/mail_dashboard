// Tiny JSON-file datastore. No native deps, works anywhere Node runs.
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function ensureDb() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ accounts: [], emails: [] }, null, 2));
  }
}

function read() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return { accounts: [], emails: [] };
  }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---- accounts ----
function getAccounts() {
  return read().accounts;
}

function addAccount(account) {
  const data = read();
  data.accounts.push(account);
  write(data);
  return account;
}

function deleteAccount(id) {
  const data = read();
  data.accounts = data.accounts.filter((a) => a.id !== id);
  write(data);
}

function findAccount(id) {
  return read().accounts.find((a) => a.id === id);
}

// ---- sent emails / tracking ----
function addEmailRecord(record) {
  const data = read();
  data.emails.push(record);
  write(data);
  return record;
}

function getEmails(accountId) {
  const data = read();
  if (accountId) return data.emails.filter((e) => e.accountId === accountId);
  return data.emails;
}

function markOpened(trackingId) {
  const data = read();
  const rec = data.emails.find((e) => e.trackingId === trackingId);
  if (rec && !rec.opened) {
    rec.opened = true;
    rec.openedAt = new Date().toISOString();
    write(data);
  }
  return rec || null;
}

function markClicked(trackingId) {
  const data = read();
  const rec = data.emails.find((e) => e.trackingId === trackingId);
  if (rec && !rec.clicked) {
    rec.clicked = true;
    rec.clickedAt = new Date().toISOString();
    write(data);
  }
  return rec || null;
}

module.exports = {
  getAccounts,
  addAccount,
  deleteAccount,
  findAccount,
  addEmailRecord,
  getEmails,
  markOpened,
  markClicked,
};
