const express = require("express");
const prisma = require("../db/prisma");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();

// Notifications age out after 2 days. Cleanup runs lazily inside the GET
// handler (scoped to the requester) so we don't need an always-on scheduler —
// the Render free tier sleeps when idle, which would starve any setInterval.
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// GET /api/notifications — current user's notifications
router.get("/", authenticate, async (req, res, next) => {
  try {
    const cutoff = new Date(Date.now() - TWO_DAYS_MS);
    await prisma.notification.deleteMany({
      where: { recipientId: req.userId, createdAt: { lt: cutoff } },
    });

    const rows = await prisma.notification.findMany({
      where: { recipientId: req.userId },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { username: true } },
        post:   { select: { id: true } },
      },
    });

    res.json(rows.map(function(n) {
      return {
        id:          n.id,
        type:        n.type.toLowerCase(),
        fromUserId:  n.senderId,
        fromUsername: n.sender ? n.sender.username : "",
        postId:      n.postId,
        read:        n.isRead,
        timestamp:   timeAgo(n.createdAt),
        createdAt:   new Date(n.createdAt).getTime(),
        message:     buildMessage(n.type, n.sender ? n.sender.username : ""),
      };
    }));
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, recipientId: req.userId },
      data:  { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { recipientId: req.userId, isRead: false },
      data:  { isRead: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id — delete one
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, recipientId: req.userId },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "now";
  if (s < 3600)  return Math.floor(s / 60) + "m";
  if (s < 86400) return Math.floor(s / 3600) + "h";
  return Math.floor(s / 86400) + "d";
}

function buildMessage(type, username) {
  if (type === "LIKE")     return username + " liked your post";
  if (type === "FOLLOW")   return username + " started following you";
  if (type === "NEW_POST") return username + " posted a new drawing";
  return "";
}

module.exports = router;
