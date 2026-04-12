const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate, supabaseAdmin } = require("../middleware/authenticate");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/posts — all posts; ?flagged=true for flagged only
router.get("/posts", async (req, res, next) => {
  try {
    const where = req.query.flagged === "true" ? { isFlagged: true } : {};
    const posts = await prisma.post.findMany({
      where,
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
        bitmap:    { width: p.width, height: p.height, pixels: p.pixels },
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

    // Revoke user session (AMS1.7)
    try {
      await supabaseAdmin.auth.admin.signOut(post.authorId, "global");
    } catch (e) { console.error("session revocation error:", e); }

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
      data:  { status: "SUSPENDED" },
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

// DELETE /api/admin/users/:id — delete a user account (soft delete)
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
