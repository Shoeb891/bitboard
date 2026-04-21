// Runs once before the whole test suite: load .env.test and migrate the test DB
// from the repo-root Prisma schema. Sets env before spawning prisma so the CLI
// uses the test DB instead of the backend/.env Supabase URL.
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

module.exports = async function globalSetup() {
  const envPath = path.resolve(__dirname, "..", ".env.test");
  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }

  const schemaPath = path.resolve(__dirname, "..", "..", "prisma", "schema.prisma");
  execSync('npx prisma migrate deploy --schema="' + schemaPath + '"', {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
};
