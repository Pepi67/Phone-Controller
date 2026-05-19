const { createXboxController } = require("./xboxController");
const overcookedXboxProfile = require("./profiles/overcookedXbox");

function describeControl(mapping) {
  if (!mapping) return "unmapped";
  return mapping.xbox ?? `dpad:${mapping.direction}`;
}

class PlayerController {
  constructor(playerNumber) {
    this.playerNumber = playerNumber;
    this.controller = createXboxController({ playerNumber });
    this.pressedButtons = new Set();
  }

  pressMappedControl(mapping) {
    if (mapping.type === "button") {
      this.controller.pressButton(mapping.xbox);
      return;
    }

    if (mapping.type === "trigger") {
      this.controller.setTrigger(mapping.xbox, 1);
      return;
    }

    if (mapping.type === "dpad") {
      this.controller.setDpad(mapping.direction, true);
    }
  }

  releaseMappedControl(mapping) {
    if (mapping.type === "button") {
      this.controller.releaseButton(mapping.xbox);
      return;
    }

    if (mapping.type === "trigger") {
      this.controller.setTrigger(mapping.xbox, 0);
      return;
    }

    if (mapping.type === "dpad") {
      this.controller.setDpad(mapping.direction, false);
    }
  }

  handleButton(data) {
    const { action, state } = data;

    if (!action || !["pressed", "released"].includes(state)) {
      console.log(`PLAYER ${this.playerNumber} IGNORED INVALID BUTTON EVENT:`, data);
      return;
    }

    const mapping = overcookedXboxProfile.buttonMap[action];

    if (!mapping) {
      console.log(`PLAYER ${this.playerNumber} IGNORED UNMAPPED BUTTON: ${action}`);
      return;
    }

    if (state === "pressed") {
      if (this.pressedButtons.has(action)) {
        console.log(`PLAYER ${this.playerNumber} IGNORED DUPLICATE PRESS: ${action}`);
        return;
      }

      this.pressedButtons.add(action);
      this.pressMappedControl(mapping);
      console.log(
        `PLAYER ${this.playerNumber} BUTTON DOWN: ${action} -> Xbox ${describeControl(mapping)}`,
      );
      return;
    }

    if (!this.pressedButtons.has(action)) {
      console.log(`PLAYER ${this.playerNumber} IGNORED DUPLICATE RELEASE: ${action}`);
      return;
    }

    this.pressedButtons.delete(action);
    this.releaseMappedControl(mapping);
    console.log(
      `PLAYER ${this.playerNumber} BUTTON UP: ${action} -> Xbox ${describeControl(mapping)}`,
    );
  }

  handleStick(data) {
    const x = Number(data.x) || 0;
    const y = Number(data.y) || 0;

    if (data.stick === "left") {
      this.controller.setLeftStick(x, y);
      console.log(`PLAYER ${this.playerNumber} LEFT STICK: ${x.toFixed(2)} ${y.toFixed(2)}`);
      return;
    }

    if (data.stick === "right") {
      this.controller.setRightStick(x, y);
      console.log(`PLAYER ${this.playerNumber} RIGHT STICK: ${x.toFixed(2)} ${y.toFixed(2)}`);
      return;
    }

    console.log(`PLAYER ${this.playerNumber} IGNORED UNKNOWN STICK:`, data);
  }

  handleInput(data) {
    if (data?.type === "button") {
      this.handleButton(data);
      return;
    }

    if (data?.type === "stick") {
      this.handleStick(data);
      return;
    }

    console.log(`PLAYER ${this.playerNumber} IGNORED UNKNOWN CONTROL:`, data);
  }

  releaseAll() {
    for (const action of this.pressedButtons) {
      const mapping = overcookedXboxProfile.buttonMap[action];

      if (mapping) {
        this.releaseMappedControl(mapping);
      }
    }

    this.pressedButtons.clear();
    this.controller.reset();
    console.log(`PLAYER ${this.playerNumber} RELEASED ALL INPUTS`);
  }

  destroy() {
    this.releaseAll();
    this.controller.disconnect();
  }
}

module.exports = {
  PlayerController,
};
