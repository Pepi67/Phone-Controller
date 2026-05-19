const DEADZONE = 0.1;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function applyDeadzone(value, deadzone = DEADZONE) {
  const clamped = clamp(Number(value) || 0, -1, 1);
  const magnitude = Math.abs(clamped);

  if (magnitude < deadzone) return 0;

  return Math.sign(clamped) * ((magnitude - deadzone) / (1 - deadzone));
}

function createNoopController(reason, label) {
  let warned = false;

  function warnOnce() {
    if (warned) return;
    warned = true;
    console.warn(
      `[XboxController ${label}] Virtual Xbox controller unavailable: ${reason}`,
    );
    console.warn(
      "[XboxController] Install ViGEmBus/Nefarius Virtual Gamepad Emulation Bus on Windows, then restart this server.",
    );
  }

  return {
    available: false,
    pressButton(button) {
      warnOnce();
      console.log(`[XboxController fallback ${label}] BUTTON DOWN skipped: ${button}`);
    },
    releaseButton(button) {
      warnOnce();
      console.log(`[XboxController fallback ${label}] BUTTON UP skipped: ${button}`);
    },
    setTrigger(trigger, value) {
      warnOnce();
      console.log(`[XboxController fallback ${label}] TRIGGER skipped: ${trigger}=${value}`);
    },
    setDpad(direction, pressed) {
      warnOnce();
      console.log(
        `[XboxController fallback ${label}] DPAD skipped: ${direction}=${pressed}`,
      );
    },
    setLeftStick(x, y) {
      warnOnce();
      console.log(
        `[XboxController fallback ${label}] LEFT STICK skipped: ${x.toFixed(2)} ${y.toFixed(2)}`,
      );
    },
    setRightStick(x, y) {
      warnOnce();
      console.log(
        `[XboxController fallback ${label}] RIGHT STICK skipped: ${x.toFixed(2)} ${y.toFixed(2)}`,
      );
    },
    reset() {
      warnOnce();
      console.log(`[XboxController fallback ${label}] RESET skipped`);
    },
    disconnect() {},
  };
}

function createXboxController({ playerNumber } = {}) {
  const label = playerNumber ? `P${playerNumber}` : "P?";
  let ViGEmClient;

  try {
    ViGEmClient = require("vigemclient");
  } catch (error) {
    return createNoopController(error.message, label);
  }

  const client = new ViGEmClient();
  const clientError = client.connect();

  if (clientError) {
    return createNoopController(clientError.message, label);
  }

  const controller = client.createX360Controller();
  const controllerError = controller.connect();

  if (controllerError) {
    return createNoopController(controllerError.message, label);
  }

  controller.resetInputs();

  const dpad = new Set();

  function updateDpad() {
    let horizontal = 0;
    let vertical = 0;

    if (dpad.has("left") && !dpad.has("right")) horizontal = -1;
    if (dpad.has("right") && !dpad.has("left")) horizontal = 1;
    if (dpad.has("up") && !dpad.has("down")) vertical = 1;
    if (dpad.has("down") && !dpad.has("up")) vertical = -1;

    controller.axis.dpadHorz.setValue(horizontal);
    controller.axis.dpadVert.setValue(vertical);
  }

  console.log(`[XboxController ${label}] Virtual Xbox 360 controller connected.`);

  return {
    available: true,
    pressButton(button) {
      controller.button[button]?.setValue(true);
    },
    releaseButton(button) {
      controller.button[button]?.setValue(false);
    },
    setTrigger(trigger, value) {
      controller.axis[trigger]?.setValue(clamp(value, 0, 1));
    },
    setDpad(direction, pressed) {
      if (pressed) {
        dpad.add(direction);
      } else {
        dpad.delete(direction);
      }

      updateDpad();
    },
    setLeftStick(x, y) {
      controller.axis.leftX.setValue(applyDeadzone(x));
      controller.axis.leftY.setValue(applyDeadzone(y));
    },
    setRightStick(x, y) {
      controller.axis.rightX.setValue(applyDeadzone(x));
      controller.axis.rightY.setValue(applyDeadzone(y));
    },
    reset() {
      dpad.clear();
      controller.resetInputs();
    },
    disconnect() {
      try {
        this.reset();
        controller.disconnect();
      } catch (error) {
        console.warn("[XboxController] Disconnect failed:", error.message);
      }
    },
  };
}

module.exports = {
  createXboxController,
};
