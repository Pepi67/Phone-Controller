const buttonMap = Object.freeze({
  a: { type: "button", xbox: "A" },
  b: { type: "button", xbox: "B" },
  x: { type: "button", xbox: "X" },
  y: { type: "button", xbox: "Y" },

  lb: { type: "button", xbox: "LEFT_SHOULDER" },
  rb: { type: "button", xbox: "RIGHT_SHOULDER" },
  ls_button: { type: "button", xbox: "LEFT_THUMB" },
  rs_button: { type: "button", xbox: "RIGHT_THUMB" },

  lt: { type: "trigger", xbox: "leftTrigger" },
  rt: { type: "trigger", xbox: "rightTrigger" },

  back: { type: "button", xbox: "BACK" },
  select: { type: "button", xbox: "BACK" },
  play: { type: "button", xbox: "START" },
  start: { type: "button", xbox: "START" },
  home: { type: "button", xbox: "GUIDE" },

  up: { type: "dpad", direction: "up" },
  down: { type: "dpad", direction: "down" },
  left: { type: "dpad", direction: "left" },
  right: { type: "dpad", direction: "right" },
});

module.exports = {
  buttonMap,
};
