// Shared test helpers — Supertest agent, DB reset, fixture seeding, sample bitmap.
const request = require("supertest");
const app = require("../app");
const prisma = require("../src/db/prisma");
const fixtures = require("./fixtures");

// Wipe every table in dependency order, then reseed the three fixture users.
async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "ModerationLog","Notification","Like","Follow","Post","User" RESTART IDENTITY CASCADE'
  );
  await prisma.user.createMany({ data: Object.values(fixtures) });
}

// Supertest agent that injects the mock auth header for a given fixture user.
function asUser(key) {
  const u = fixtures[key];
  if (!u) throw new Error("unknown fixture user: " + key);
  const agent = request(app);
  return {
    get:   function(url) { return agent.get(url).set("x-test-user-id", u.id); },
    post:  function(url) { return agent.post(url).set("x-test-user-id", u.id); },
    patch: function(url) { return agent.patch(url).set("x-test-user-id", u.id); },
    delete:function(url) { return agent.delete(url).set("x-test-user-id", u.id); },
  };
}

// Unauthenticated Supertest agent (no x-test-user-id header).
function asGuest() { return request(app); }

// Minimal valid bitmap payload — 32x32 canvas, all pixels index 0.
function sampleBitmap(overrides) {
  return Object.assign({
    width: 32,
    height: 32,
    pixels: new Array(32 * 32).fill(0),
    palette: ["#000000", "#ffffff"],
    caption: "test post",
    hashtags: [],
  }, overrides || {});
}

// Insert a Post row directly for tests that don't need to exercise POST /api/posts.
async function seedPost(overrides) {
  return prisma.post.create({
    data: Object.assign({
      authorId: fixtures.bob.id,
      caption:  "seeded post",
      width: 32, height: 32,
      pixels: new Array(32 * 32).fill(0),
      palette: ["#000000"],
      hashtags: [],
    }, overrides || {}),
  });
}

module.exports = { request, app, prisma, fixtures, resetDb, asUser, asGuest, sampleBitmap, seedPost };
