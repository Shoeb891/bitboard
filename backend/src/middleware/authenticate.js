const { createClient } = require("@supabase/supabase-js");
const prisma = require("../db/prisma");

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Verifies the Supabase JWT in the Authorization header.
 * On success, attaches req.userId (the Supabase auth user UUID).
 * Rejects requests from users whose Prisma account is SUSPENDED or DELETED
 * so moderation takes effect even if a stale Supabase session survives.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Allow the registration endpoint to run before a Prisma profile exists.
  const isRegister = req.method === "POST" && req.originalUrl.endsWith("/api/auth/register");

  if (!isRegister) {
    const profile = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { status: true },
    });
    if (profile && profile.status !== "ACTIVE") {
      return res.status(403).json({ error: "Account " + profile.status.toLowerCase() });
    }
  }

  req.userId = user.id;
  next();
}

/**
 * Same as authenticate but does not reject — instead sets req.userId if
 * a valid token is present, otherwise sets req.userId = null.
 * Used on public endpoints that behave differently for authenticated users
 * (e.g. returning liked=true/false on posts).
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.userId = null;
    return next();
  }

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  req.userId = error || !user ? null : user.id;
  next();
}

module.exports = { authenticate, optionalAuthenticate, supabaseAdmin };
