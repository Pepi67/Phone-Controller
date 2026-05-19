const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { ControllerManager } = require("./controllerManager");

const app = express();
const server = http.createServer(app);
const controllerManager = new ControllerManager();

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

function broadcastPlayers() {
  io.emit("players-updated", {
    players: controllerManager.getPlayers(),
  });
}

io.on("connection", (socket) => {
  const session = controllerManager.assignPlayer(socket.id);

  if (session) {
    socket.emit("player-assigned", {
      playerNumber: session.playerNumber,
      socketId: socket.id,
    });
  } else {
    socket.emit("player-rejected", {
      reason: "No free player slots",
    });
  }

  broadcastPlayers();

  socket.on("control", (data) => {
    controllerManager.handleInput(socket.id, data);
  });

  socket.on("disconnect", () => {
    controllerManager.releasePlayer(socket.id);
    broadcastPlayers();
  });
});

function shutdown() {
  controllerManager.releaseAll();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("error", (error) => {
  controllerManager.releaseAll();

  if (error.code === "EADDRINUSE") {
    console.error("Port 3000 is already in use. Stop the old backend and run npm start again.");
  } else {
    console.error("Server error:", error);
  }

  process.exit(1);
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Socket server running on port 3000");
});
