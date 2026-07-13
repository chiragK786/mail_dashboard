const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const { accountId } = req.query;
  const emails = db.getEmails(accountId).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json(emails);
});

module.exports = router;
