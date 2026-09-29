const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_MEMBERS = 2;

// Keep the app intentionally tiny: only the latest 100 messages are retained
// while the server is running.
const messages = [];

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  const connected = io.engine.clientsCount;

  if (connected > MAX_MEMBERS) {
    socket.emit("room-full");
    socket.disconnect(true);
    return;
  }

  const memberNumber = connected === 1 ? 1 : 2;
  socket.emit("member-assigned", { memberNumber });
  socket.emit("chat-history", messages);

  io.emit("members", { count: Math.min(io.engine.clientsCount, MAX_MEMBERS) });

  socket.on("send-message", (rawText) => {
    if (typeof rawText !== "string") return;

    const text = rawText.trim().slice(0, 1000);
    if (!text) return;

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      member: memberNumber,
      text,
      time: new Date().toISOString()
    };

    messages.push(message);
    if (messages.length > 100) messages.shift();

    io.emit("new-message", message);
  });

  socket.on("disconnect", () => {
    io.emit("members", { count: Math.min(io.engine.clientsCount, MAX_MEMBERS) });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Arkvidya chat running at http://localhost:${PORT}`);
});