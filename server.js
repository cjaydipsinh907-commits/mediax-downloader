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

// Check private IPv4 addresses
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

// Validate public HTTPS URL
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

// Match a domain or its subdomain
function isHost(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

// Detect platform from URL
function detectPlatform(parsed) {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname;

  // YouTube
  if (
    isHost(host, "youtube.com") ||
    host === "youtu.be" ||
    isHost(host, "youtube-nocookie.com")
  ) {
    let contentType = "Video";

    if (/^\/shorts\//i.test(path)) {
      contentType = "Shorts";
    } else if (/^\/live\//i.test(path)) {
      contentType = "Live";
    }

    return {
      platform: "YouTube",
      contentType
    };
  }

  // Instagram
  if (
    isHost(host, "instagram.com") ||
    host === "instagr.am"
  ) {
    let contentType = "Instagram Link";

    if (/^\/reel\//i.test(path)) {
      contentType = "Reel";
    } else if (/^\/p\//i.test(path)) {
      contentType = "Post";
    } else if (/^\/stories\//i.test(path)) {
      contentType = "Story";
    }

    return {
      platform: "Instagram",
      contentType
    };
  }

  // Facebook
  if (
    isHost(host, "facebook.com") ||
    host === "fb.watch"
  ) {
    let contentType = "Facebook Link";

    if (
      /\/(watch|videos|reel|reels)\//i.test(path)
    ) {
      contentType = "Video";
    }

    return {
      platform: "Facebook",
      contentType
    };
  }

  // WhatsApp
  if (
    isHost(host, "whatsapp.com") ||
    host === "wa.me"
  ) {
    return {
      platform: "WhatsApp",
      contentType: "WhatsApp Link"
    };
  }

  return {
    platform: "Other Website",
    contentType: "Website Link"
  };
}

// Platform detection API
app.post("/api/check", (req, res) => {
  const parsed = validatePublicHttpsUrl(req.body?.url);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid public HTTPS link."
    });
  }

  const result = detectPlatform(parsed);

  return res.json({
    success: true,
    platform: result.platform,
    contentType: result.contentType,
    url: parsed.toString(),
    downloadAvailable: false,
    message: result.platform + " link detected successfully."
  });
});

// Supported direct media extensions
const extensions = {
  image: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  video: [".mp4", ".webm", ".mov", ".m4v"]
};

// Direct media inspection API
app.post("/api/media/inspect", (req, res) => {
  const parsed = validatePublicHttpsUrl(req.body?.url);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unsafe HTTPS link."
    });
  }

  let pathname;

  try {
    pathname = decodeURIComponent(parsed.pathname).toLowerCase();
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid media URL."
    });
  }

  const imageMatch = extensions.image.some(ext =>
    pathname.endsWith(ext)
  );

  const videoMatch = extensions.video.some(ext =>
    pathname.endsWith(ext)
  );

  if (!imageMatch && !videoMatch) {
    return res.status(400).json({
      success: false,
      message: "Unsupported media file. A direct media file link is required."
    });
  }

  return res.json({
    success: true,
    mediaType: imageMatch ? "image" : "video",
    previewUrl: parsed.toString(),
    message: "Direct media link recognized. Preview depends on source permissions."
  });
});

// Direct video link recognition API
app.post("/api/media/download-check", (req, res) => {
  const parsed = validatePublicHttpsUrl(req.body?.url);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unsafe HTTPS link."
    });
  }

  let pathname;

  try {
    pathname = decodeURIComponent(parsed.pathname).toLowerCase();
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid media URL."
    });
  }

  const isVideo = extensions.video.some(ext =>
    pathname.endsWith(ext)
  );

  if (!isVideo) {
    return res.status(400).json({
      success: false,
      message: "A direct video file link is required."
    });
  }

  return res.json({
    success: true,
    mediaType: "video",
    downloadUrl: parsed.toString(),
    downloadAvailable: false,
    message: "Direct video link recognized. Actual downloading depends on the source website."
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MEDIAX API running on port ${PORT}`);
});
