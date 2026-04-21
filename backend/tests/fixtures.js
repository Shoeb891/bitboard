// Fixed test users seeded at the start of every test file.
module.exports = {
  alice: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "alice@bitboard.test",
    username: "alice",
    nickname: "Alice",
    role: "USER",
    status: "ACTIVE",
  },
  bob: {
    id: "22222222-2222-2222-2222-222222222222",
    email: "bob@bitboard.test",
    username: "bob",
    nickname: "Bob",
    role: "USER",
    status: "ACTIVE",
  },
  admin: {
    id: "33333333-3333-3333-3333-333333333333",
    email: "admin@bitboard.test",
    username: "admin",
    nickname: "Admin",
    role: "ADMIN",
    status: "ACTIVE",
  },
};
