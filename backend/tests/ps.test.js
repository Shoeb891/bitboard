// TC-PS1.1 — Publishing a drawing makes it appear on the author's profile.
const { asUser, resetDb, sampleBitmap, prisma, fixtures } = require("./helpers");

describe("TC-PS1.1 — publish drawing appears on profile", function() {
  beforeAll(resetDb);
  afterAll(async function() { await prisma.$disconnect(); });

  test("POST /api/posts then GET /api/posts/user/:id lists the new post", async function() {
    const pub = await asUser("alice").post("/api/posts").send(sampleBitmap({ caption: "my first drawing" }));
    expect(pub.status).toBe(201);

    const feed = await asUser("alice").get("/api/posts/user/" + fixtures.alice.id);
    expect(feed.status).toBe(200);
    expect(feed.body).toHaveLength(1);
    expect(feed.body[0].id).toBe(pub.body.id);
    expect(feed.body[0].userId).toBe(fixtures.alice.id);
    expect(feed.body[0].caption).toBe("my first drawing");
  });
});
