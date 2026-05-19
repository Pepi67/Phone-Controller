const { PlayerController } = require("./playerController");

const MAX_PLAYERS = 4;

class ControllerManager {
  constructor() {
    this.sessionsBySocketId = new Map();
  }

  getPlayers() {
    return [...this.sessionsBySocketId.values()]
      .map((session) => ({
        playerNumber: session.playerNumber,
        connected: true,
      }))
      .sort((a, b) => a.playerNumber - b.playerNumber);
  }

  getAvailablePlayerNumber() {
    const usedNumbers = new Set(
      [...this.sessionsBySocketId.values()].map((session) => session.playerNumber),
    );

    for (let playerNumber = 1; playerNumber <= MAX_PLAYERS; playerNumber += 1) {
      if (!usedNumbers.has(playerNumber)) {
        return playerNumber;
      }
    }

    return null;
  }

  assignPlayer(socketId) {
    if (this.sessionsBySocketId.has(socketId)) {
      return this.sessionsBySocketId.get(socketId);
    }

    const playerNumber = this.getAvailablePlayerNumber();

    if (!playerNumber) {
      console.log("NO FREE PLAYER SLOTS");
      return null;
    }

    const session = {
      socketId,
      playerNumber,
      controller: new PlayerController(playerNumber),
    };

    this.sessionsBySocketId.set(socketId, session);
    console.log(`PLAYER ${playerNumber} CONNECTED: ${socketId}`);
    return session;
  }

  handleInput(socketId, data) {
    const session = this.sessionsBySocketId.get(socketId);

    if (!session) {
      console.log(`IGNORED INPUT FROM UNASSIGNED SOCKET: ${socketId}`);
      return;
    }

    session.controller.handleInput(data);
  }

  releasePlayer(socketId) {
    const session = this.sessionsBySocketId.get(socketId);

    if (!session) {
      return null;
    }

    session.controller.destroy();
    this.sessionsBySocketId.delete(socketId);
    console.log(`PLAYER ${session.playerNumber} DISCONNECTED`);
    return session.playerNumber;
  }

  releaseAll() {
    for (const socketId of this.sessionsBySocketId.keys()) {
      this.releasePlayer(socketId);
    }
  }
}

module.exports = {
  ControllerManager,
};
