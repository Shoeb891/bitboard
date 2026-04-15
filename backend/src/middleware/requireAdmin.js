const prisma = require("../db/prisma");

/**
 * Must be used AFTER authenticate middleware.
 * Checks that the authenticated user has role = ADMIN.
 */
async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, status: true },
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ error: "Admin access required" });
    }
    // Re-check status in case it changed since authenticate() ran.
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Account is suspended or deleted" });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAdmin;
