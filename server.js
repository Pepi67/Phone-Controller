const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Controller connected:", socket.id);

  socket.on("control", (data) => {
    console.log("Control:", data);
  });

  socket.on("disconnect", () => {
    console.log("Controller disconnected:", socket.id);
  });
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Socket server running on port 3000");
});