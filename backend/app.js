// Express app factory — no network binding; imported by server.js (prod) and tests (Supertest).
const express = require("express");
const cors    = require("cors");

const authRoutes          = require("./src/routes/auth");
const postsRoutes         = require("./src/routes/posts");
const usersRoutes         = require("./src/routes/users");
const notificationsRoutes = require("./src/routes/notifications");
const adminRoutes         = require("./src/routes/admin");
const errorHandler        = require("./src/middleware/errorHandler");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth",          authRoutes);
app.use("/api/posts",         postsRoutes);
app.use("/api/users",         usersRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin",         adminRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use(errorHandler);

module.exports = app;
