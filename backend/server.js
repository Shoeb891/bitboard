const express    = require("express");
const cors       = require("cors");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const app    = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "now";
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function computeScale(w, h) {
  return Math.max(4, Math.min(Math.floor(560 / w), Math.floor(460 / h)));
}

function formatPost(p, likeCount = 0) {
  return {
    id:        p.id,
    username:  p.author.username,
    timestamp: timeAgo(p.createdAt),
    likes:     likeCount,
    liked:     false,
    bitmap: {
      width:  p.width,
      height: p.height,
      pixels: p.pixels,
      scale:  computeScale(p.width, p.height),
    },
  };
}

// ── GET /api/posts ────────────────────────────────────────────────────────────

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author:  { select: { username: true } },
        _count:  { select: { likes: true } },
      },
    });
    res.json(posts.map(p => formatPost(p, p._count.likes)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ── POST /api/posts ───────────────────────────────────────────────────────────

app.post("/api/posts", async (req, res) => {
  const { username, width, height, pixels } = req.body;

  if (!width || !height || !Array.isArray(pixels)) {
    return res.status(400).json({ error: "Missing width, height, or pixels" });
  }

  try {
    // Find or create the user by username (no auth yet)
    let user = await prisma.user.findUnique({ where: { username: username || "anon" } });
    if (!user) {
      const name = (username || "anon").slice(0, 32);
      user = await prisma.user.create({
        data: {
          username:     name,
          email:        `${name}@bitboard.local`,
          passwordHash: "placeholder",
        },
      });
    }

    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        width,
        height,
        pixels,
        palette:  [],
        hashtags: [],
      },
      include: { author: { select: { username: true } } },
    });

    res.status(201).json(formatPost(post, 0));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ── POST /api/posts/:id/like ──────────────────────────────────────────────────
// Likes are local state only until auth is added — this is a stub.

app.post("/api/posts/:id/like", (req, res) => {
  res.json({ ok: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Bitboard API running on http://localhost:${PORT}`));
