const express = require("express");
const prisma = require("../db/prisma");
const { authenticate, supabaseAdmin } = require("../middleware/authenticate");

const router = express.Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Called by the frontend immediately after supabase.auth.signUp succeeds.
// Creates the Prisma User profile using the Supabase auth user's UUID.
router.post("/register", authenticate, async (req, res, next) => {
  try {
    const { username, nickname } = req.body;

    if (!username) {
      return res.status(400).json({ error: "username is required" });
    }

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
    let user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });

    if (!user) {
      user = await lazyCreateProfile(req.userId);
    }

    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
});

// Lazy-create a Prisma User row for a Supabase auth user that doesn't have one
// yet. Reads the chosen username/nickname from user_metadata (set by the
// frontend's signUp call). Falls back to deriving a username from the email
// local-part. Retries with short random suffixes on username uniqueness
// collisions so a slow migration path never blocks login.
async function lazyCreateProfile(userId) {
  const { data: { user: authUser }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !authUser) {
    const e = new Error("Could not load Supabase auth user");
    e.status = 500;
    throw e;
  }

  const meta = authUser.user_metadata || {};
  const baseUsername = sanitizeUsername(meta.username || authUser.email.split("@")[0]);
  const nickname = (meta.nickname && String(meta.nickname).trim()) || baseUsername;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0
      ? baseUsername
      : baseUsername + "-" + Math.random().toString(36).slice(2, 6);
    try {
      return await prisma.user.create({
        data: {
          id:       userId,
          email:    authUser.email,
          username: candidate,
          nickname,
        },
        include: {
          _count: { select: { followers: true, following: true, posts: true } },
        },
      });
    } catch (err) {
      // P2002 = unique constraint violation (username or email collision)
      if (err.code !== "P2002") throw err;
      if (Array.isArray(err.meta?.target) && err.meta.target.includes("email")) {
        // Same email already used by a different Prisma row — can't recover here.
        throw err;
      }
      // Otherwise it was the username; loop and try a new suffix.
    }
  }
  throw new Error("Could not allocate a unique username after 5 attempts");
}

function sanitizeUsername(raw) {
  const cleaned = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 28);
  return cleaned.length >= 3 ? cleaned : "user" + Math.random().toString(36).slice(2, 6);
}

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
