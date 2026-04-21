// Replaces the Supabase-backed auth module with a header-driven stub.
// The stub reads `x-test-user-id` from requests and sets req.userId; missing or empty
// header produces a 401 so TC-UAS1.11 (auth enforcement) still passes against the mock.
jest.mock("../src/middleware/authenticate", function() {
  function authenticate(req, res, next) {
    const uid = req.headers["x-test-user-id"];
    if (!uid) return res.status(401).json({ error: "Missing or invalid Authorization header" });
    req.userId = uid;
    next();
  }
  function optionalAuthenticate(req, res, next) {
    req.userId = req.headers["x-test-user-id"] || null;
    next();
  }
  return { authenticate, optionalAuthenticate, supabaseAdmin: { auth: { admin: { signOut: async function() {} } } } };
});

// Silence fan-out WebSocket emits so tests don't need a Socket.io server.
jest.mock("../src/websockets/socketServer", function() {
  return { emitToUser: function() {}, initSocketServer: function() {} };
});
