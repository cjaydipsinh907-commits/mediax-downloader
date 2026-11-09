const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MEDIAX Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "online",
    service: "MEDIAX"
  });
});

function matchesDomain(host, domain) {
  return host === domain || host.endsWith("." + domain);
}

function analyzeLink(rawUrl) {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.toLowerCase();

  if (matchesDomain(host, "instagram.com")) {
    let type = "Instagram Link";

    if (path.startsWith("/reel/")) type = "Instagram Reel";
    else if (path.startsWith("/p/")) type = "Instagram Post";
    else if (path.startsWith("/stories/")) type = "Instagram Story";

    return { platform: "Instagram", contentType: type };
  }

  if (
    matchesDomain(host, "facebook.com") ||
    host === "fb.watch"
  ) {
    let type = "Facebook Link";

    if (path.includes("/reel/")) type = "Facebook Reel";
    else if (path.includes("/watch") || path.includes("/videos/")) {
      type = "Facebook Video";
    } else if (path.includes("/posts/")) {
      type = "Facebook Post";
    }

    return { platform: "Facebook", contentType: type };
  }

  if (
    matchesDomain(host, "youtube.com") ||
    host === "youtu.be"
  ) {
    let type = "YouTube Link";

    if (path.startsWith("/shorts/")) {
      type = "YouTube Short";
    } else if (path === "/watch" || host === "youtu.be") {
      type = "YouTube Video";
    }

    return { platform: "YouTube", contentType: type };
  }

  if (
    matchesDomain(host, "whatsapp.com") ||
    host === "wa.me"
  ) {
    return {
      platform: "WhatsApp",
      contentType: "WhatsApp Link"
    };
  }

  if (
    host === "google.com" ||
    host === "google.co.in" ||
    host === "google.co.uk"
  ) {
    return {
      platform: "Google",
      contentType: "Google Search/Web Link"
    };
  }

  if (host === "googlechrome.com") {
    return {
      platform: "Chrome",
      contentType: "Chrome Website"
    };
  }

  return null;
}

app.post("/api/check", (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid URL."
    });
  }

  if (url.length > 2048) {
    return res.status(400).json({
      success: false,
      message: "Link is too long."
    });
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== "https:") {
      return res.status(400).json({
        success: false,
        message: "Only HTTPS links are accepted."
      });
    }

    const result = analyzeLink(url);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "This platform is not supported yet."
      });
    }

    return res.json({
      success: true,
      message: "Link analyzed successfully!",
      platform: result.platform,
      contentType: result.contentType,
      note: "Media downloading is not connected yet."
    });

  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid URL."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`MEDIAX running on port ${PORT}`);
});
