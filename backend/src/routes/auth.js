const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/authenticate");

const router = express.Router();
const prisma = new PrismaClient();

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Called by the frontend immediately after supabase.auth.signUp succeeds.
// Creates the Prisma User profile using the Supabase auth user's UUID.
router.post("/register", authenticate, async (req, res, next) => {
  try {
    const { username, nickname } = req.body;

    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }

    // Fetch email from Supabase so we don't require the client to send it
    const { supabaseAdmin } = require("../middleware/authenticate");
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(req.userId);

    const user = await prisma.user.create({
      data: {
        id:       req.userId,          // UUID matches Supabase auth user
        email:    authUser.email,
        username: username.trim().toLowerCase(),
        nickname: nickname?.trim() || username.trim(),
      },
    });

    res.status(201).json(formatUser(user));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
router.patch("/me", authenticate, async (req, res, next) => {
  try {
    const { nickname, bio, avatarColor, uiTheme } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(nickname    !== undefined && { nickname }),
        ...(bio         !== undefined && { bio }),
        ...(avatarColor !== undefined && { avatarColor }),
        ...(uiTheme     !== undefined && { uiTheme }),
      },
      include: {
        _count: { select: { followers: true, following: true, posts: true } },
      },
    });

    res.json(formatUser(updated));
  } catch (err) {
    next(err);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatUser(u) {
  return {
    id:          u.id,
    email:       u.email,
    username:    u.username,
    nickname:    u.nickname,
    bio:         u.bio,
    avatarColor: u.avatarColor,
    role:        u.role,
    status:      u.status,
    uiTheme:     u.uiTheme,
    createdAt:   u.createdAt,
    followerCount: u._count?.followers ?? 0,
    followingCount: u._count?.following ?? 0,
    postCount:   u._count?.posts ?? 0,
  };
}

module.exports = router;
