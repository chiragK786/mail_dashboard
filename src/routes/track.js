const express = require("express");
const db = require("../db");

const router = express.Router();

// 1x1 transparent PNG, served with no-cache headers so every open re-fires the request
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

router.get("/:trackingId.png", (req, res) => {
  const { trackingId } = req.params;
  db.markOpened(trackingId); // no-op if unknown id, so the pixel always responds the same way

  res.set({
    "Content-Type": "image/png",
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });
  res.send(TRANSPARENT_PNG);
});

module.exports = router;
