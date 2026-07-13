const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

router.post("/pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No PDF uploaded (field name must be 'pdf')" });

  try {
    const data = await pdfParse(req.file.buffer);
    const found = data.text.match(EMAIL_REGEX) || [];
    const emails = [...new Set(found.map((e) => e.toLowerCase()))];
    res.json({ emails, count: emails.length });
  } catch (err) {
    res.status(500).json({ error: "Could not read PDF: " + err.message });
  }
});

module.exports = router;
