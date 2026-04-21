// TC-AMS1.0 — Admin views flagged posts via ?flagged=true filter.
const { asUser, resetDb, seedPost, prisma, fixtures } = require("./helpers");

describe("TC-AMS1.0 — admin flagged posts filter", function() {
  beforeAll(resetDb);
  afterAll(async function() { await prisma.$disconnect(); });

  test("GET /api/admin/posts?flagged=true returns only flagged posts to admins", async function() {
    const flagged   = await seedPost({ authorId: fixtures.bob.id, isFlagged: true,  caption: "bad post" });
    await seedPost({ authorId: fixtures.bob.id, isFlagged: false, caption: "good post" });

    const res = await asUser("admin").get("/api/admin/posts?flagged=true");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(flagged.id);
    expect(res.body[0].isFlagged).toBe(true);
  });

  test("non-admin cannot access /api/admin/posts", async function() {
    const res = await asUser("alice").get("/api/admin/posts");
    expect(res.status).toBe(403);
  });
});
