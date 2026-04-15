// Validates bitmap post payloads against the constraints defined by the
// drawing canvas (frontend/src/Pages/DrawingCanvas.jsx GRID_PRESETS + 16-colour
// DEFAULT_PALETTE). Runs before POST /api/posts.

const ALLOWED_DIMENSIONS = [
  [32, 32],
  [48, 48],
  [64, 24],
  [48, 20],
  [24, 36],
];

const MAX_PALETTE_SIZE = 16;
const MAX_HASHTAGS     = 10;
const MAX_HASHTAG_LEN  = 32;
const MAX_CAPTION_LEN  = 500;
const MIN_FRAMES       = 2;
const MAX_FRAMES       = 60;

function isAllowedSize(w, h) {
  return ALLOWED_DIMENSIONS.some(function(pair) {
    return pair[0] === w && pair[1] === h;
  });
}

function validateBitmap(req, res, next) {
  const { width, height, pixels, palette, hashtags, caption, frames } = req.body;

  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return res.status(400).json({ error: "width and height must be integers" });
  }
  if (!isAllowedSize(width, height)) {
    return res.status(400).json({ error: "unsupported canvas size" });
  }

  if (!Array.isArray(pixels)) {
    return res.status(400).json({ error: "pixels must be an array" });
  }
  if (pixels.length !== width * height) {
    return res.status(400).json({ error: "pixels length must equal width * height" });
  }

  const paletteSize = Array.isArray(palette) && palette.length > 0
    ? palette.length
    : MAX_PALETTE_SIZE;

  if (paletteSize > MAX_PALETTE_SIZE) {
    return res.status(400).json({ error: "palette may contain at most 16 colours" });
  }

  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i];
    if (!Number.isInteger(v) || v < 0 || v >= paletteSize) {
      return res.status(400).json({ error: "pixel value out of palette range" });
    }
  }

  if (palette !== undefined) {
    if (!Array.isArray(palette) || palette.some(function(c) { return typeof c !== "string"; })) {
      return res.status(400).json({ error: "palette must be an array of strings" });
    }
  }

  if (hashtags !== undefined) {
    if (!Array.isArray(hashtags) || hashtags.length > MAX_HASHTAGS) {
      return res.status(400).json({ error: "hashtags must be an array of at most 10 items" });
    }
    for (const t of hashtags) {
      if (typeof t !== "string" || t.length === 0 || t.length > MAX_HASHTAG_LEN) {
        return res.status(400).json({ error: "each hashtag must be a non-empty string up to 32 chars" });
      }
    }
  }

  if (caption !== undefined && typeof caption === "string" && caption.length > MAX_CAPTION_LEN) {
    return res.status(400).json({ error: "caption must be 500 characters or fewer" });
  }

  if (frames !== undefined && frames !== null) {
    if (!Array.isArray(frames)) {
      return res.status(400).json({ error: "frames must be an array" });
    }
    if (frames.length < MIN_FRAMES || frames.length > MAX_FRAMES) {
      return res.status(400).json({ error: "frames must contain between 2 and 60 entries" });
    }
    const expectedLen = width * height;
    for (const frame of frames) {
      if (!frame || !Array.isArray(frame.pixels)) {
        return res.status(400).json({ error: "each frame must have a pixels array" });
      }
      if (frame.pixels.length !== expectedLen) {
        return res.status(400).json({ error: "each frame's pixels length must equal width * height" });
      }
      for (let i = 0; i < frame.pixels.length; i++) {
        const v = frame.pixels[i];
        if (!Number.isInteger(v) || v < 0 || v >= paletteSize) {
          return res.status(400).json({ error: "frame pixel value out of palette range" });
        }
      }
    }
  }

  next();
}

module.exports = validateBitmap;
