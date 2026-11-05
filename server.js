const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(helmet());

app.use(cors({
  origin: [
    "https://cjaydipsinh907-commits.github.io"
  ],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "10kb" }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

app.get("/", (req, res) => {
  res.json({
    name: "MEDIAX API",
    status: "online",
    message: "Backend is working!"
  });
});

app.post("/api/check", (req, res) => {
  const { url } = req.body || {};

  if (typeof url !== "string" || url.length > 2048) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid URL."
    });
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid URL."
    });
  }

  if (parsed.protocol !== "https:") {
    return res.status(400).json({
      success: false,
      message: "Only HTTPS links are accepted."
    });
  }

  const host = parsed.hostname.toLowerCase();
  let platform = null;

  if (
    host === "instagram.com" ||
    host.endsWith(".instagram.com")
  ) {
    platform = "Instagram";
  } else if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.watch"
  ) {
    platform = "Facebook";
  } else if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    platform = "YouTube";
  } else if (
    host === "whatsapp.com" ||
    host.endsWith(".whatsapp.com") ||
    host === "wa.me"
  ) {
    platform = "WhatsApp";
  }

  if (!platform) {
    return res.status(400).json({
      success: false,
      message: "Unsupported platform."
    });
  }

  res.json({
    success: true,
    platform,
    message: "Platform detected successfully.",
    downloadAvailable: false
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MEDIAX API running on port ${PORT}`);
});
