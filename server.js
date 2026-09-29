const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_MEMBERS = 4;

// Keep the app intentionally tiny: only the latest 100 messages are retained
// while the server is running.
const messages = [];
const takenMembers = new Set();

app.use(express.static(path.join(__dirname, "public")));

function broadcastMembers() {
  io.emit("members", { count: takenMembers.size, max: MAX_MEMBERS });
}

io.on("connection", (socket) => {
  let memberNumber = null;
  for (let n = 1; n <= MAX_MEMBERS; n++) {
    if (!takenMembers.has(n)) {
      memberNumber = n;
      break;
    }
  }

  if (memberNumber === null) {
    socket.emit("room-full", { max: MAX_MEMBERS });
    socket.disconnect(true);
    return;
  }

  takenMembers.add(memberNumber);
  socket.emit("member-assigned", { memberNumber, max: MAX_MEMBERS });
  socket.emit("chat-history", messages);

  broadcastMembers();

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

  socket.on("message-seen", (id) => {
    const index = messages.findIndex((m) => m.id === id && m.member !== memberNumber);
    if (index === -1) return;
    messages.splice(index, 1);
    io.emit("message-destroyed", { id });
  });

  socket.on("disconnect", () => {
    takenMembers.delete(memberNumber);
    broadcastMembers();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`School chat running at http://localhost:${PORT}`);
});