// Shared Prisma client singleton — one connection pool across the app.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
