require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const express = require("express");
const cors    = require("cors");
const http    = require("http");

const authRoutes          = require("./src/routes/auth");
const postsRoutes         = require("./src/routes/posts");
const usersRoutes         = require("./src/routes/users");
const notificationsRoutes = require("./src/routes/notifications");
const adminRoutes         = require("./src/routes/admin");
const errorHandler        = require("./src/middleware/errorHandler");
const { initSocketServer } = require("./src/websockets/socketServer");

const app    = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/posts",         postsRoutes);
app.use("/api/users",         usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin",         adminRoutes);

// Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Socket.io ────────────────────────────────────────────────────────────────
initSocketServer(server, corsOrigin);

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, function() {
  console.log("Bitboard API running on http://localhost:" + PORT);
});
