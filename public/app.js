const accountSelect = document.getElementById("account-select");
const accSaveBtn = document.getElementById("acc-save-btn");
const dropzone = document.getElementById("dropzone");
const dropzoneText = document.getElementById("dropzone-text");
const pdfInput = document.getElementById("pdf-input");
const extractedWrap = document.getElementById("extracted-wrap");
const extractedCount = document.getElementById("extracted-count");
const recipientsBox = document.getElementById("recipients-box");

const subjectPreset = document.getElementById("subject-preset");
const subjectInput = document.getElementById("subject");
const messageInput = document.getElementById("message");
const attachmentInput = document.getElementById("attachment-input");
const attachmentNameEl = document.getElementById("attachment-name");

const sendBtn = document.getElementById("send-btn");
const sendStatus = document.getElementById("send-status");

const manualEmail = document.getElementById("manual-email");
const manualSendBtn = document.getElementById("manual-send-btn");
const manualSendStatus = document.getElementById("manual-send-status");

const trackingBody = document.getElementById("tracking-body");
const refreshBtn = document.getElementById("refresh-btn");

async function loadAccounts() {
  const res = await fetch("/api/accounts");
  const accounts = await res.json();
  accountSelect.innerHTML = accounts.length
    ? accounts.map((a) => `<option value="${a.id}">${a.label} (${a.email})</option>`).join("")
    : `<option value="">No accounts yet — add one below</option>`;
}

accSaveBtn.addEventListener("click", async () => {
  const label = document.getElementById("acc-label").value.trim();
  const email = document.getElementById("acc-email").value.trim();
  const appPassword = document.getElementById("acc-app-password").value.trim();
  if (!email || !appPassword) {
    alert("Email and app password are required");
    return;
  }
  accSaveBtn.disabled = true;
  accSaveBtn.textContent = "Saving...";
  try {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, email, appPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save account");
    document.getElementById("acc-label").value = "";
    document.getElementById("acc-email").value = "";
    document.getElementById("acc-app-password").value = "";
    await loadAccounts();
  } catch (err) {
    alert(err.message);
  } finally {
    accSaveBtn.disabled = false;
    accSaveBtn.textContent = "Save account";
  }
});

// ---- PDF extraction ----
dropzone.addEventListener("click", () => pdfInput.click());
dropzone.addEventListener("dragover", (e) => e.preventDefault());
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) uploadPdf(file);
});
pdfInput.addEventListener("change", () => {
  if (pdfInput.files[0]) uploadPdf(pdfInput.files[0]);
});

async function uploadPdf(file) {
  dropzoneText.textContent = `Reading ${file.name}...`;
  const form = new FormData();
  form.append("pdf", file);
  try {
    const res = await fetch("/api/upload/pdf", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not extract emails");
    extractedWrap.classList.remove("hidden");
    extractedCount.textContent = `Found ${data.count} email address${data.count === 1 ? "" : "es"}`;
    recipientsBox.value = data.emails.join("\n");
    dropzoneText.textContent = `Loaded: ${file.name} (click to replace)`;
  } catch (err) {
    dropzoneText.textContent = "Click to choose a PDF, or drop it here";
    alert(err.message);
  }
}

// ---- Subject template dropdown ----
subjectPreset.addEventListener("change", () => {
  if (subjectPreset.value === "__custom__") {
    subjectInput.value = "";
    subjectInput.focus();
  } else {
    subjectInput.value = subjectPreset.value;
  }
});
// preload the first preset into the subject field
subjectInput.value = subjectPreset.value;

// ---- Attachment ----
attachmentInput.addEventListener("change", () => {
  const file = attachmentInput.files[0];
  attachmentNameEl.textContent = file ? `Attached: ${file.name} (${(file.size / 1024).toFixed(0)} KB)` : "";
});

// ---- Shared send logic ----
async function sendCampaign(recipients, statusEl, button, busyLabel, idleLabel) {
  const accountId = accountSelect.value;
  const subject = subjectInput.value.trim();
  const message = messageInput.value.trim();

  if (!accountId) return alert("Choose a sender account first");
  if (!subject || !message) return alert("Subject and message are required");
  if (recipients.length === 0) return alert("No recipient(s) given");

  button.disabled = true;
  button.textContent = busyLabel;
  statusEl.textContent = `Sending to ${recipients.length} recipient(s)...`;

  const form = new FormData();
  form.append("accountId", accountId);
  form.append("subject", subject);
  form.append("message", message);
  form.append("recipients", JSON.stringify(recipients));
  if (attachmentInput.files[0]) form.append("attachment", attachmentInput.files[0]);

  try {
    const res = await fetch("/api/send", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Send failed");
    const okCount = data.results.filter((r) => r.status === "sent").length;
    const failCount = data.results.length - okCount;
    statusEl.textContent = `Sent: ${okCount}${failCount ? `, Failed: ${failCount}` : ""}`;
    await loadTracking();
  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
  } finally {
    button.disabled = false;
    button.textContent = idleLabel;
  }
}

sendBtn.addEventListener("click", () => {
  const recipients = recipientsBox.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  sendCampaign(recipients, sendStatus, sendBtn, "Sending...", "Send to list above");
});

manualSendBtn.addEventListener("click", () => {
  const email = manualEmail.value.trim();
  if (!email) return alert("Enter a recipient email address");
  sendCampaign([email], manualSendStatus, manualSendBtn, "Sending...", "Send to this email").then(() => {
    manualEmail.value = "";
  });
});

// ---- Tracking table ----
async function loadTracking() {
  const res = await fetch("/api/emails");
  const emails = await res.json();
  trackingBody.innerHTML = emails
    .map((e) => {
      const attachmentTag = e.attachmentName ? ` 📎 ${escapeHtml(e.attachmentName)}` : "";

      let openedCell;
      if (e.status === "failed") openedCell = `<span class="badge badge-failed">Failed</span>`;
      else if (e.opened) openedCell = `<span class="badge badge-opened">Opened${e.openedAt ? "<br>" + new Date(e.openedAt).toLocaleString() : ""}</span>`;
      else openedCell = `<span class="badge badge-sent">Not detected</span>`;

      let clickedCell;
      if (e.status === "failed") clickedCell = "—";
      else if (e.clicked) clickedCell = `<span class="badge badge-opened">Clicked${e.clickedAt ? "<br>" + new Date(e.clickedAt).toLocaleString() : ""}</span>`;
      else clickedCell = `<span class="badge badge-sent">Not clicked</span>`;

      return `<tr>
        <td>${e.recipient}</td>
        <td>${escapeHtml(e.subject)}${attachmentTag}</td>
        <td>${e.senderEmail}</td>
        <td>${new Date(e.sentAt).toLocaleString()}</td>
        <td>${openedCell}</td>
        <td>${clickedCell}</td>
      </tr>`;
    })
    .join("");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

refreshBtn.addEventListener("click", loadTracking);

// initial load + poll every 5s so open status updates almost instantly without a manual refresh
loadAccounts();
loadTracking();
setInterval(loadTracking, 5000);
