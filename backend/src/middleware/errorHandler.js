/**
 * Global Express error handler — must be the last middleware registered.
 * Catches Prisma unique constraint violations and returns friendly messages.
 */
function errorHandler(err, req, res, next) {
  console.error(err);

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    const field = err.meta?.target?.[0] ?? "field";
    return res.status(409).json({ error: `${field} already taken` });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  // Honour an explicit status on the error, else 500.
  const status = err.status ?? err.statusCode ?? 500;
  const message = err.message ?? "Internal server error";
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
