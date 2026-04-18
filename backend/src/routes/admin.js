// /api/admin/* — moderation endpoints. Every route is gated by
// authenticate + requireAdmin, and every destructive action writes a ModerationLog row.

const express = require("express");
const prisma = require("../db/prisma");
const { authenticate, supabaseAdmin } = require("../middleware/authenticate");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// Router-wide gate so individual handlers don't repeat the auth+role checks.
router.use(authenticate, requireAdmin);

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

// GET /api/admin/posts — all posts; ?flagged=true for flagged only; ?q= for text search
// Response mirrors the main-feed shape so the admin UI can reuse PostCard.
router.get("/posts", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const filters = [];
    if (req.query.flagged === "true") filters.push({ isFlagged: true });
    if (q) {
      filters.push({
        OR: [
          { caption:  { contains: q, mode: "insensitive" } },
          { hashtags: { has: q.startsWith("#") ? q : "#" + q } },
          { author:   { username: { contains: q, mode: "insensitive" } } },
          { author:   { nickname: { contains: q, mode: "insensitive" } } },
        ],
      });
    }
    const where = filters.length ? { AND: filters } : {};
    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, nickname: true, avatarColor: true } },
        _count: { select: { likes: true } },
      },
    });
    res.json(posts.map(function(p) {
      return {
        id:          p.id,
        userId:      p.authorId,
        username:    p.author ? p.author.username : "",
        nickname:    p.author ? (p.author.nickname || p.author.username) : "",
        avatarColor: p.author ? (p.author.avatarColor || null) : null,
        timestamp:   timeAgo(p.createdAt),
        createdAt:   new Date(p.createdAt).getTime(),
        likes:       p._count ? p._count.likes : 0,
        liked:       false,
        caption:     p.caption || "",
        tags:        (p.hashtags || []).map(function(t) { return t.startsWith("#") ? t : "#" + t; }),
        isFlagged:   p.isFlagged,
        bitmap: {
          width:  p.width,
          height: p.height,
          pixels: p.pixels,
          scale:  computeScale(p.width, p.height),
        },
      };
    }));
  } catch (err) { next(err); }
});

// GET /api/admin/users — list users for moderation; supports ?q= search.
// Includes SUSPENDED/DELETED users (unlike /api/users/search, which hides them).
router.get("/users", async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    const where = q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { nickname: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};
    const users = await prisma.user.findMany({
      where,
      orderBy: { username: "asc" },
      take: 200,
      include: { _count: { select: { posts: true } } },
    });
    res.json(users.map(function(u) {
      return {
        id:          u.id,
        username:    u.username,
        nickname:    u.nickname,
        avatarColor: u.avatarColor,
        role:        u.role,
        status:      u.status,
        suspendedAt: u.suspendedAt,
        createdAt:   u.createdAt,
        postCount:   u._count ? u._count.posts : 0,
      };
    }));
  } catch (err) { next(err); }
});

// GET /api/admin/logs — recent moderation log entries (AMS1.5)
router.get("/logs", async (req, res, next) => {
  try {
    const logs = await prisma.moderationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { admin: { select: { username: true, nickname: true } } },
    });
    res.json(logs.map(function(l) {
      return {
        id:        l.id,
        action:    l.action,
        targetId:  l.targetId,
        adminId:   l.adminId,
        adminUsername: l.admin ? l.admin.username : "",
        createdAt: l.createdAt,
      };
    }));
  } catch (err) { next(err); }
});

// GET /api/admin/feed — same as posts but includes flagged info
router.get("/feed", async (req, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, nickname: true } },
        _count: { select: { likes: true } },
      },
    });
    res.json(posts.map(function(p) {
      return {
        id:        p.id,
        userId:    p.authorId,
        username:  p.author ? p.author.username : "",
        caption:   p.caption || "",
        isFlagged: p.isFlagged,
        likes:     p._count ? p._count.likes : 0,
        createdAt: p.createdAt,
      };
    }));
  } catch (err) { next(err); }
});

// DELETE /api/admin/posts/:id — remove a post
router.delete("/posts/:id", async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    await prisma.notification.deleteMany({ where: { postId: req.params.id } });
    await prisma.like.deleteMany({ where: { postId: req.params.id } });
    await prisma.post.delete({ where: { id: req.params.id } });

    // Log moderation action
    await prisma.moderationLog.create({
      data: { adminId: req.userId, action: "REMOVE_POST", targetId: req.params.id },
    });

    // Kick the author out of any active sessions. Errors here are logged but
    // don't roll back the moderation action.
    try {
      await supabaseAdmin.auth.admin.signOut(post.authorId, "global");
    } catch (e) { console.error("session revocation error:", e); }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/admin/posts/:id/unflag — clear the flagged state on a post
router.post("/posts/:id/unflag", async (req, res, next) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (post.isFlagged) {
      await prisma.post.update({ where: { id: req.params.id }, data: { isFlagged: false } });
    }

    await prisma.moderationLog.create({
      data: { adminId: req.userId, action: "UNFLAG_POST", targetId: req.params.id },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/suspend — suspend a user account
router.patch("/users/:id/suspend", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id: req.params.id },
      data:  { status: "SUSPENDED", suspendedAt: new Date() },
    });

    await prisma.moderationLog.create({
      data: { adminId: req.userId, action: "SUSPEND_ACCOUNT", targetId: req.params.id },
    });

    // Revoke all sessions
    try {
      await supabaseAdmin.auth.admin.signOut(req.params.id, "global");
    } catch (e) { console.error("session revocation error:", e); }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/unsuspend — restore a suspended account to ACTIVE
router.patch("/users/:id/unsuspend", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id: req.params.id },
      data:  { status: "ACTIVE", suspendedAt: null },
    });

    await prisma.moderationLog.create({
      data: { adminId: req.userId, action: "UNSUSPEND_ACCOUNT", targetId: req.params.id },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:id — soft delete (status = DELETED). Keeps the row
// so posts, likes, and ModerationLog references remain valid; authenticate() rejects them.
router.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id: req.params.id },
      data:  { status: "DELETED" },
    });

    await prisma.moderationLog.create({
      data: { adminId: req.userId, action: "DELETE_ACCOUNT", targetId: req.params.id },
    });

    // Revoke all sessions
    try {
      await supabaseAdmin.auth.admin.signOut(req.params.id, "global");
    } catch (e) { console.error("session revocation error:", e); }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:id/promote — promote to admin
router.patch("/users/:id/promote", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id: req.params.id },
      data:  { role: "ADMIN" },
    });

    await prisma.moderationLog.create({
      data: { adminId: req.userId, action: "PROMOTE_ADMIN", targetId: req.params.id },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
