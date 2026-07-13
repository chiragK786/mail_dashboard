const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { encrypt } = require("../crypto");

const router = express.Router();

// List accounts (never send the password back to the browser)
router.get("/", (req, res) => {
  const accounts = db.getAccounts().map(({ id, label, email }) => ({ id, label, email }));
  res.json(accounts);
});

// Add a new Gmail account (email + 16-char app password from Google)
router.post("/", (req, res) => {
  const { label, email, appPassword } = req.body;
  if (!email || !appPassword) {
    return res.status(400).json({ error: "email and appPassword are required" });
  }
  try {
    const account = {
      id: uuidv4(),
      label: label || email,
      email,
      encPassword: encrypt(appPassword),
    };
    db.addAccount(account);
    res.json({ id: account.id, label: account.label, email: account.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", (req, res) => {
  db.deleteAccount(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
