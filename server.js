const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const net = require("node:net");

const app = express();

// Render runs behind a reverse proxy.
// Trust only the nearest proxy hop.
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// Disable framework identification
app.disable("x-powered-by");

// CORS configuration
app.use(cors({
  origin: "https://cjaydipsinh907-commits.github.io",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
  maxAge: 600
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later."
    });
  }
});

app.use(apiLimiter);

// JSON request limit
app.use(express.json({
  limit: "10kb"
}));

// Homepage
app.get("/", (req, res) => {
  res.json({
    name: "MEDIAX API",
    status: "online",
    message: "Backend is working!"
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy"
  });
});

// Validate public HTTPS URL
function validatePublicHttpsUrl(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2048
  ) {
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

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/\.$/, "");

  const blockedHosts = [
    "localhost",
    "metadata.google.internal"
  ];

  if (
    blockedHosts.includes(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid")
  ) {
    return null;
  }

  // Block all direct IP addresses
  const ipHostname = hostname.replace(/^\[|\]$/g, "");

  if (net.isIP(ipHostname) !== 0) {
    return null;
  }

  return parsed;
}

// Match domain or subdomain
function isHost(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

// Detect platform
function detectPlatform(parsed) {
  const host = parsed.hostname
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");

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

    if (/\/(watch|videos|reel|reels)\//i.test(path)) {
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

// Extract safe media pathname
function getMediaPath(parsed) {
  try {
    return decodeURIComponent(parsed.pathname).toLowerCase();
  } catch {
    return null;
  }
}

// Direct media inspection API
app.post("/api/media/inspect", (req, res) => {
  const parsed = validatePublicHttpsUrl(req.body?.url);

  if (!parsed) {
    return res.status(400).json({
      success: false,
      message: "Invalid or unsafe HTTPS link."
    });
  }

  const pathname = getMediaPath(parsed);

  if (!pathname) {
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

  const pathname = getMediaPath(parsed);

  if (!pathname) {
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

// Unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested API endpoint was not found."
  });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error("MEDIAX API error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request."
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large."
    });
  }

  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later."
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MEDIAX API running on port ${PORT}`);
});
