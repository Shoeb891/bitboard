const express = require("express");
const prisma = require("../db/prisma");
const { authenticate, optionalAuthenticate } = require("../middleware/authenticate");

const router = express.Router();

function formatUserProfile(u) {
  return {
    id:          u.id,
    username:    u.username,
    nickname:    u.nickname,
    bio:         u.bio,
    avatarColor: u.avatarColor,
    role:        u.role,
    status:      u.status,
    createdAt:   u.createdAt,
    followerCount:  u._count ? u._count.followers  : 0,
    followingCount: u._count ? u._count.following   : 0,
    postCount:      u._count ? u._count.posts       : 0,
  };
}

const userInclude = {
  _count: { select: { followers: true, following: true, posts: true } },
};

// GET /api/users/:username — public profile
router.get("/:username", optionalAuthenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: userInclude,
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const profile = formatUserProfile(user);

    // If the requester is authenticated, add whether they follow this user
    if (req.userId) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.userId, followingId: user.id } },
      });
      profile.isFollowing = !!follow;
    }

    res.json(profile);
  } catch (err) { next(err); }
});

// GET /api/users/:id/followers
router.get("/:id/followers", async (req, res, next) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: req.params.id },
      include: { follower: { include: userInclude } },
    });
    res.json(follows.map(function(f) { return formatUserProfile(f.follower); }));
  } catch (err) { next(err); }
});

// GET /api/users/:id/following
router.get("/:id/following", async (req, res, next) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.params.id },
      include: { following: { include: userInclude } },
    });
    res.json(follows.map(function(f) { return formatUserProfile(f.following); }));
  } catch (err) { next(err); }
});

// POST /api/users/:id/follow — follow a user
router.post("/:id/follow", authenticate, async (req, res, next) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: "User not found" });

    await prisma.follow.create({
      data: { followerId: req.userId, followingId: req.params.id },
    });

    // Create notification
    setImmediate(async function() {
      try {
        const { emitToUser } = require("../websockets/socketServer");
        const notif = await prisma.notification.create({
          data: { type: "FOLLOW", recipientId: req.params.id, senderId: req.userId },
        });
        const sender = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
        emitToUser(req.params.id, "notification:new", {
          id:          notif.id,
          type:        "follow",
          fromUserId:  req.userId,
          fromUsername: sender ? sender.username : "",
          postId:      null,
          read:        false,
          timestamp:   "now",
          createdAt:   Date.now(),
          message:     (sender ? sender.username : "") + " started following you",
        });
      } catch (e) { console.error("notify error:", e); }
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id/follow — unfollow a user
router.delete("/:id/follow", authenticate, async (req, res, next) => {
  try {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: req.userId, followingId: req.params.id } },
    });

    // Remove follow notification
    await prisma.notification.deleteMany({
      where: { type: "FOLLOW", recipientId: req.params.id, senderId: req.userId },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
