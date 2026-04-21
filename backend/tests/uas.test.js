// TC-UAS1.11 — Authentication enforced on protected actions.
const { asGuest, resetDb, seedPost, prisma } = require("./helpers");

describe("TC-UAS1.11 — auth enforced on protected endpoints", function() {
  beforeAll(resetDb);
  afterAll(async function() { await prisma.$disconnect(); });

  test("POST /api/posts without JWT returns 401 and creates no post", async function() {
    const before = await prisma.post.count();
    const res = await asGuest().post("/api/posts").send({ width: 32, height: 32, pixels: [] });
    expect(res.status).toBe(401);
    expect(await prisma.post.count()).toBe(before);
  });

  test("POST /api/posts/:id/like without JWT returns 401 and creates no like", async function() {
    const post = await seedPost();
    const res = await asGuest().post("/api/posts/" + post.id + "/like");
    expect(res.status).toBe(401);
    expect(await prisma.like.count({ where: { postId: post.id } })).toBe(0);
  });
});
