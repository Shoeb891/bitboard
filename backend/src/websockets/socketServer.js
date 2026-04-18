// Socket.io server — each user joins a room keyed by their UUID so
// emitToUser() can target them without broadcasting.

const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const { setupGameHandlers } = require("./gameServer");

// Module-level so emitToUser() can reach the server from other modules.
let io = null;

function initSocketServer(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Handshake auth — verify the Supabase JWT passed in socket.handshake.auth.
  io.use(async function(socket, next) {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Missing auth token"));

    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !data.user) return next(new Error("Invalid token"));
      socket.userId = data.user.id;
      next();
    } catch (err) {
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", function(socket) {
    // Each user joins their personal room for targeted notifications
    socket.join(socket.userId);
    console.log("Socket connected: " + socket.userId);

    // Register drawing-game event handlers on the same socket
    setupGameHandlers(io, socket);

    socket.on("disconnect", function() {
      console.log("Socket disconnected: " + socket.userId);
    });
  });

  return io;
}

// Emit to a single user's room. No-op if the server hasn't been initialized.
function emitToUser(userId, event, data) {
  if (io) {
    io.to(userId).emit(event, data);
  }
}

module.exports = { initSocketServer, emitToUser };
