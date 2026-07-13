const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { decrypt } = require("../crypto");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const UPLOADS_DIR = path.join(__dirname, "..", "..", "data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// multipart/form-data: accountId, subject, message, recipients (JSON string array), attachment (optional file)
router.post("/", upload.single("attachment"), async (req, res) => {
  const { accountId, subject, message } = req.body;
  let recipients;
  try {
    recipients = JSON.parse(req.body.recipients || "[]");
  } catch {
    return res.status(400).json({ error: "recipients must be a JSON array" });
  }

  if (!accountId || !subject || !message || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "accountId, subject, message and recipients[] are required" });
  }

  const account = db.findAccount(accountId);
  if (!account) return res.status(404).json({ error: "Sender account not found" });

  let appPassword;
  try {
    appPassword = decrypt(account.encPassword);
  } catch (err) {
    return res.status(500).json({ error: "Could not decrypt stored app password: " + err.message });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: account.email, pass: appPassword },
  });

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  const results = [];

  const attachments = req.file
    ? [{ filename: req.file.originalname, content: req.file.buffer }]
    : [];

  for (const recipient of recipients) {
    const trackingId = uuidv4();

    // Save a per-recipient copy of the attachment so the click-tracking link can serve it back
    let hasStoredFile = false;
    if (req.file) {
      const storedName = `${trackingId}__${safeFilename(req.file.originalname)}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, storedName), req.file.buffer);
      hasStoredFile = true;
    }

    const pixel = `<img src="${baseUrl}/api/track/${trackingId}.png" width="1" height="1" style="display:none" alt="" />`;
    const clickLink = `${baseUrl}/api/click/${trackingId}`;
    const linkLine = hasStoredFile
      ? `<p><a href="${clickLink}" target="_blank" rel="noopener">📄 View ${escapeHtml(
          req.file.originalname
        )}</a></p>`
      : `<p><a href="${clickLink}" target="_blank" rel="noopener">View online</a></p>`;

    const htmlBody = `<div style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;">${escapeHtml(
      message
    )}</div>${linkLine}${pixel}`;

    try {
      await transporter.sendMail({
        from: account.email,
        to: recipient,
        subject,
        text: `${message}\n\nView online: ${clickLink}`,
        html: htmlBody,
        attachments,
      });

      db.addEmailRecord({
        id: uuidv4(),
        trackingId,
        accountId,
        senderEmail: account.email,
        recipient,
        subject,
        attachmentName: req.file ? req.file.originalname : null,
        sentAt: new Date().toISOString(),
        opened: false,
        openedAt: null,
        clicked: false,
        clickedAt: null,
        status: "sent",
      });

      results.push({ recipient, status: "sent" });
    } catch (err) {
      db.addEmailRecord({
        id: uuidv4(),
        trackingId,
        accountId,
        senderEmail: account.email,
        recipient,
        subject,
        attachmentName: req.file ? req.file.originalname : null,
        sentAt: new Date().toISOString(),
        opened: false,
        openedAt: null,
        clicked: false,
        clickedAt: null,
        status: "failed",
        error: err.message,
      });
      results.push({ recipient, status: "failed", error: err.message });
    }
  }

  res.json({ results });
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = router;
