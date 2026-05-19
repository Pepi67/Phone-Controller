const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Phone connected:", socket.id);

  socket.on("control", (data) => {
    console.log("Command from phone:", data);
  });

  socket.on("disconnect", () => {
    console.log("Phone disconnected:", socket.id);
  });
});

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});