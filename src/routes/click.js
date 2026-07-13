const fs = require("fs");
const path = require("path");
const express = require("express");
const db = require("../db");

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, "..", "..", "data", "uploads");

router.get("/:trackingId", (req, res) => {
  const { trackingId } = req.params;
  const record = db.markClicked(trackingId);

  // find a stored file for this tracking id, if an attachment was sent
  let matchedFile = null;
  if (fs.existsSync(UPLOADS_DIR)) {
    const prefix = `${trackingId}__`;
    const found = fs.readdirSync(UPLOADS_DIR).find((f) => f.startsWith(prefix));
    if (found) matchedFile = found;
  }

  if (matchedFile) {
    const filePath = path.join(UPLOADS_DIR, matchedFile);
    const displayName = matchedFile.slice(`${trackingId}__`.length);
    res.setHeader("Content-Disposition", `inline; filename="${displayName}"`);
    return res.sendFile(filePath);
  }

  // no attachment for this link — show a minimal landing page
  res.set("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Thanks</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f1115;color:#e7eaf0;}</style>
</head><body><p>${record ? "Thanks for checking this out!" : "This link is no longer valid."}</p></body></html>`);
});

module.exports = router;
