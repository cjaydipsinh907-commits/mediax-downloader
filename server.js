const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const net = require("node:net");

const app = express();

app.use(helmet());

app.use(cors({
  origin: "https://cjaydipsinh907-commits.github.io",
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

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(Number);

  if (
    parts.length !== 4 ||
    parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)
  ) return true;

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function validatePublicHttpsUrl(value) {
  if (typeof value !== "string" || value.length > 2048) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname
  ) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return null;
  }

  if (net.isIP(hostname) === 4 && isPrivateIPv4(hostname)) {
    return null;
  }

  if (net.isIP(hostname) === 6) {
    const ip = hostname.toLowerCase();

    if (
      ip === "::1" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      ip.startsWith("fe80:")
    ) {
      return null;
    }
  }

  return parsed;
}

function detectPlatform(host) {
  if (
    host === "instagram.com" ||
    host.endsWith(".instagram.com")
  ) return "Instagram";

  if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.watch"
  ) return "Facebook";

  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) return "YouTube";

  if (
    host === "whatsapp.com" ||
    host.endsWith(".whatsapp.com") ||
    host === "wa.me"
  ) return "WhatsApp";

  return null;
}

const extensions = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  video: [".mp4", ".webm", ".mov", ".m4v"]
};

app.post("/api/check", (req, res) => {
  const parsed = validatePublicHttpsUrl(req.body?.url);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid public HTTPS link."
    });
  }

  const platform = detectPlatform(parsed.hostname.toLowerCase());

  if (!platform) {
    return res.status(400).json({
      success: false,
      message: "Unsupported platform."
    });
  }

  return res.json({
    success: true,
    platform,
    message: "Platform detected successfully.",
    downloadAvailable: false
  });
});

app.post("/api/media/inspect", (req, res) => {
  const parsed = validatePublicHttpsUrl(req.body?.url);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unsafe HTTPS link."
    });
  }

  const pathname = decodeURIComponent(parsed.pathname).toLowerCase();

  const imageMatch = extensions.image.some(ext =>
    pathname.endsWith(ext)
  );

  const videoMatch = extensions.video.some(ext =>
    pathname.endsWith(ext)
  );

  if (!imageMatch && !videoMatch) {
    return res.status(400).json({
      success: false,
      message: "Unsupported file. Use a direct JPG, PNG, GIF, WebP, MP4, WebM, MOV or M4V link."
    });
  }

  return res.json({
    success: true,
    mediaType: imageMatch ? "image" : "video",
    previewUrl: parsed.toString(),
    message: "Media link checked. Preview may depend on the source website."
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MEDIAX API running on port ${PORT}`);
});
