const express = require("express");
const prisma = require("../db/prisma");
const { authenticate, optionalAuthenticate } = require("../middleware/authenticate");
const validateBitmap = require("../middleware/validateBitmap");

const router = express.Router();

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "now";
  if (s < 3600)  return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

function computeScale(w, h) {
  return Math.max(4, Math.min(Math.floor(560 / w), Math.floor(460 / h)));
}

function formatPost(p, likeCount, liked) {
  return {
    id:        p.id,
    userId:    p.authorId,
    username:  p.author ? p.author.username : "",
    nickname:  p.author ? (p.author.nickname || p.author.username) : "",
    avatarColor: p.author ? (p.author.avatarColor || null) : null,
    timestamp: timeAgo(p.createdAt),
    createdAt: new Date(p.createdAt).getTime(),
    likes:     likeCount,
    liked,
    caption:   p.caption || "",
    tags:      (p.hashtags || []).map(function(t) { return t.startsWith("#") ? t : "#" + t; }),
    isFlagged: p.isFlagged,
    bitmap: {
      width:  p.width,
      height: p.height,
      pixels: p.pixels,
      scale:  computeScale(p.width, p.height),
    },
    frames:  Array.isArray(p.frames) ? p.frames : null,
  };
}

async function enrichPosts(posts, userId) {
  if (!userId || posts.length === 0) {
    return posts.map(function(p) { return formatPost(p, p._count ? p._count.likes : 0, false); });
  }
  const postIds = posts.map(function(p) { return p.id; });
  const userLikes = await prisma.like.findMany({
    where: { userId, postId: { in: postIds } },
    select: { postId: true },
  });
  const likedSet = new Set(userLikes.map(function(l) { return l.postId; }));
  return posts.map(function(p) { return formatPost(p, p._count ? p._count.likes : 0, likedSet.has(p.id)); });
}

const postInclude = {
  author: { select: { username: true, nickname: true, avatarColor: true } },
  _count: { select: { likes: true } },
};

function formatNotification(n, sender) {
  return {
    id:          n.id,
    type:        n.type.toLowerCase(),
    fromUserId:  n.senderId,
    fromUsername: sender ? sender.username : "",
    postId:      n.postId,
    read:        n.isRead,
    timestamp:   "now",
    createdAt:   Date.now(),
    message:     buildMessage(n.type, sender ? sender.username : ""),
  };
}

function buildMessage(type, username) {
  if (type === "LIKE")     return username + " liked your post";
  if (type === "FOLLOW")   return username + " started following you";
  if (type === "NEW_POST") return username + " posted a new drawing";
  return "";
}

// GET /api/posts — all posts, newest first
router.get("/", optionalAuthenticate, async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" }, include: postInclude });
    res.json(await enrichPosts(posts, req.userId));
  } catch (err) { next(err); }
});

// GET /api/posts/feed — personalized feed
router.get("/feed", authenticate, async (req, res, next) => {
  try {
    const follows = await prisma.follow.findMany({ where: { followerId: req.userId }, select: { followingId: true } });
    const followingIds = follows.map(function(f) { return f.followingId; });
    const authorIds = [...new Set([req.userId, ...followingIds])];
    const posts = await prisma.post.findMany({ where: { authorId: { in: authorIds } }, orderBy: { createdAt: "desc" }, include: postInclude });
    res.json(await enrichPosts(posts, req.userId));
  } catch (err) { next(err); }
});

// GET /api/posts/hashtags — all hashtags used across all posts, with counts.
// Declared before /tag/:tag so the literal "hashtags" isn't matched as a tag.
router.get("/hashtags", async (req, res, next) => {
  try {
    const rows = await prisma.post.findMany({ select: { hashtags: true } });
    const counts = new Map();
    for (const r of rows) {
      for (const raw of r.hashtags || []) {
        const tag = raw.startsWith("#") ? raw : "#" + raw;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    const list = Array.from(counts.entries())
      .map(function(entry) { return { tag: entry[0], count: entry[1] }; })
      .sort(function(a, b) { return b.count - a.count || a.tag.localeCompare(b.tag); });
    res.json(list);
  } catch (err) { next(err); }
});

// GET /api/posts/tag/:tag — posts by hashtag
router.get("/tag/:tag", optionalAuthenticate, async (req, res, next) => {
  try {
    const tag = req.params.tag.startsWith("#") ? req.params.tag : "#" + req.params.tag;
    const posts = await prisma.post.findMany({ where: { hashtags: { has: tag } }, orderBy: { createdAt: "desc" }, include: postInclude });
    const enriched = await enrichPosts(posts, req.userId);
    enriched.sort(function(a, b) { return b.likes - a.likes; });
    res.json(enriched);
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId — posts by a user
router.get("/user/:userId", optionalAuthenticate, async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({ where: { authorId: req.params.userId }, orderBy: { createdAt: "desc" }, include: postInclude });
    res.json(await enrichPosts(posts, req.userId));
  } catch (err) { next(err); }
});

// GET /api/posts/user/:userId/liked — posts a user has liked
router.get("/user/:userId/liked", optionalAuthenticate, async (req, res, next) => {
  try {
    const likes = await prisma.like.findMany({
      where: { userId: req.params.userId },
      include: { post: { include: postInclude } },
      orderBy: { createdAt: "desc" },
    });
    const posts = likes.map(function(l) { return l.post; }).filter(Boolean);
    res.json(await enrichPosts(posts, req.userId));
  } catch (err) { next(err); }
});

// POST /api/posts — create a new drawing post
router.post("/", authenticate, validateBitmap, async (req, res, next) => {
  try {
    const { width, height, pixels, caption, hashtags, palette, frames } = req.body;
    const post = await prisma.post.create({
      data: {
        authorId: req.userId, width, height, pixels,
        caption:  caption  || "",
        hashtags: hashtags || [],
        palette:  palette  || [],
        frames:   Array.isArray(frames) && frames.length > 0 ? frames : undefined,
      },
      include: postInclude,
    });
    const formatted = formatPost(post, 0, false);
    // Notify followers asynchronously
    setImmediate(async function() {
      try {
        const { emitToUser } = require("../websockets/socketServer");
        const followers = await prisma.follow.findMany({ where: { followingId: req.userId }, select: { followerId: true } });
        for (const f of followers) {
          const notif = await prisma.notification.create({
            data: { type: "NEW_POST", recipientId: f.followerId, senderId: req.userId, postId: post.id },
          });
          emitToUser(f.followerId, "notification:new", formatNotification(notif, post.author));
          emitToUser(f.followerId, "post:new", formatted);
        }
      } catch (e) { console.error("notify error:", e); }
    });
    res.status(201).json(formatted);
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id — delete own post only
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.authorId !== req.userId) return res.status(403).json({ error: "Forbidden" });
    await prisma.notification.deleteMany({ where: { postId: req.params.id } });
    await prisma.like.deleteMany({ where: { postId: req.params.id } });
    await prisma.post.delete({ where: { id: req.params.id } });
    setImmediate(async function() {
      try {
        const { emitToUser } = require("../websockets/socketServer");
        const followers = await prisma.follow.findMany({ where: { followingId: req.userId }, select: { followerId: true } });
        for (const f of followers) {
          emitToUser(f.followerId, "post:deleted", { postId: req.params.id });
        }
      } catch (e) { console.error("emit error:", e); }
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/flag — flag a post for admin review
router.post("/:id/flag", authenticate, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (!post.isFlagged) {
      await prisma.post.update({ where: { id: req.params.id }, data: { isFlagged: true } });
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/like — toggle like
router.post("/:id/like", authenticate, async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { author: { select: { username: true } } },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId: req.userId, postId: req.params.id } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      await prisma.notification.deleteMany({ where: { type: "LIKE", postId: req.params.id, senderId: req.userId } });
    } else {
      await prisma.like.create({ data: { userId: req.userId, postId: req.params.id } });
      if (post.authorId !== req.userId) {
        setImmediate(async function() {
          try {
            const { emitToUser } = require("../websockets/socketServer");
            const notif = await prisma.notification.create({
              data: { type: "LIKE", recipientId: post.authorId, senderId: req.userId, postId: post.id },
            });
            const sender = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
            emitToUser(post.authorId, "notification:new", formatNotification(notif, sender));
          } catch (e) { console.error("notify error:", e); }
        });
      }
    }

    const likeCount = await prisma.like.count({ where: { postId: req.params.id } });
    res.json({ liked: !existing, likes: likeCount });
  } catch (err) { next(err); }
});

module.exports = router;
