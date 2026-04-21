// API entry point — wires the Express app from app.js to Socket.io on a single HTTP server.
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const http = require("http");
const app  = require("./app");
const { initSocketServer } = require("./src/websockets/socketServer");

const server = http.createServer(app);
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
initSocketServer(server, corsOrigin);

const PORT = process.env.PORT || 3001;
server.listen(PORT, function() {
  console.log("Bitboard API running on http://localhost:" + PORT);
});
