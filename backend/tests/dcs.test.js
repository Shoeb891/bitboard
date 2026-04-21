// TC-DCS1.4 — Drawings stored as bitmap data (flat pixel array + width/height/palette).
const { asUser, resetDb, sampleBitmap, prisma, fixtures } = require("./helpers");

describe("TC-DCS1.4 — drawings stored as bitmap data", function() {
  beforeAll(resetDb);
  afterAll(async function() { await prisma.$disconnect(); });

  test("POST /api/posts persists pixels as a flat array with width, height, palette", async function() {
    const payload = sampleBitmap({
      pixels: Array.from({ length: 32 * 32 }, function(_, i) { return i % 2; }),
      palette: ["#000000", "#ffffff"],
    });

    const res = await asUser("alice").post("/api/posts").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.bitmap).toMatchObject({ width: 32, height: 32 });
    expect(Array.isArray(res.body.bitmap.pixels)).toBe(true);
    expect(res.body.bitmap.pixels).toHaveLength(32 * 32);

    const stored = await prisma.post.findUnique({ where: { id: res.body.id } });
    expect(stored.authorId).toBe(fixtures.alice.id);
    expect(stored.width).toBe(32);
    expect(stored.height).toBe(32);
    expect(stored.pixels).toHaveLength(32 * 32);
    expect(stored.pixels.every(function(v) { return Number.isInteger(v); })).toBe(true);
    expect(stored.palette).toEqual(["#000000", "#ffffff"]);
  });
});
