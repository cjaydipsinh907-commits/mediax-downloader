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

app.post("/api/check", (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid URL."
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

    return res.json({
      success: true,
      message: "Link received!",
      note: "Media processing is not connected yet."
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
