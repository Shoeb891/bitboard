// TC-FS1.1 — Liking a post creates a Like record and increments the like count.
const { asUser, resetDb, seedPost, prisma, fixtures } = require("./helpers");

describe("TC-FS1.1 — like a post from the feed", function() {
  beforeAll(resetDb);
  // Brief wait lets the fire-and-forget notification emit from /like finish before we disconnect.
  afterAll(async function() {
    await new Promise(function(r) { setTimeout(r, 100); });
    await prisma.$disconnect();
  });

  test("POST /api/posts/:id/like creates a Like row and returns likes=1", async function() {
    const post = await seedPost({ authorId: fixtures.bob.id });

    const res = await asUser("alice").post("/api/posts/" + post.id + "/like");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ liked: true, likes: 1 });

    const rows = await prisma.like.findMany({ where: { postId: post.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(fixtures.alice.id);
  });
});
