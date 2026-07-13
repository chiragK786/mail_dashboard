require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");

const accountsRoute = require("./src/routes/accounts");
const uploadRoute = require("./src/routes/upload");
const sendRoute = require("./src/routes/send");
const trackRoute = require("./src/routes/track");
const clickRoute = require("./src/routes/click");
const emailsRoute = require("./src/routes/emails");

const app = express();
const PORT = process.env.PORT || 3000;

// make sure data dir exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/accounts", accountsRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/send", sendRoute);
app.use("/api/track", trackRoute);
app.use("/api/click", clickRoute);
app.use("/api/emails", emailsRoute);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Mail dashboard running at http://localhost:${PORT}`);
  if (!process.env.BASE_URL || process.env.BASE_URL.includes("localhost")) {
    console.log(
      "⚠️  BASE_URL is not set to a public URL — open-tracking will NOT work until this server is reachable from the internet (deploy it, or use ngrok/cloudflared for testing)."
    );
  }
});
