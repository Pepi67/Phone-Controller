import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Circle,
  Maximize,
  Minimize,
  Play,
  RotateCcw,
  Settings,
  Wifi,
} from "lucide-react";

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

const buttonBaseClass = `
  flex select-none appearance-none items-center justify-center p-0
  border border-white/30 bg-zinc-800 text-white
  shadow-[0_8px_22px_rgba(0,0,0,0.58),inset_0_1px_0_rgba(255,255,255,0.16)]
  outline-none transition-colors
`;

function ControllerButton({
  action,
  children,
  className = "",
  label,
  onSend,
}) {
  const [active, setActive] = useState(false);
  const pressedRef = useRef(false);
  const pointerIdRef = useRef(null);

  function sendState(state, pointerId) {
    onSend(
      {
        type: "button",
        action,
        state,
      },
      { pointerId },
    );
  }

  function press(event) {
    event.preventDefault();
    event.stopPropagation();

    if (pressedRef.current) {
      console.log(
        `FRONTEND IGNORED DUPLICATE PRESS: ${action} pointerId=${event.pointerId}`,
      );
      return;
    }

    pressedRef.current = true;
    pointerIdRef.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable on some mobile browser paths.
    }

    setActive(true);
    navigator.vibrate?.(12);
    console.log(`FRONTEND SEND: button ${action} pressed pointerId=${event.pointerId}`);
    sendState("pressed", event.pointerId);
  }

  function release(event) {
    event?.preventDefault();
    event?.stopPropagation();

    if (!pressedRef.current) {
      console.log(
        `FRONTEND IGNORED DUPLICATE RELEASE: ${action} pointerId=${event?.pointerId ?? "none"}`,
      );
      return;
    }

    if (event && event.pointerId !== pointerIdRef.current) {
      console.log(
        `FRONTEND IGNORED WRONG POINTER RELEASE: ${action} pointerId=${event.pointerId}`,
      );
      return;
    }

    const releasedPointerId = pointerIdRef.current;
    pressedRef.current = false;
    pointerIdRef.current = null;
    setActive(false);

    if (
      event?.currentTarget &&
      releasedPointerId !== null &&
      event.currentTarget.hasPointerCapture?.(releasedPointerId)
    ) {
      try {
        event.currentTarget.releasePointerCapture(releasedPointerId);
      } catch {
        // Capture may already be gone by the time release is handled.
      }
    }

    console.log(`FRONTEND SEND: button ${action} released pointerId=${releasedPointerId}`);
    sendState("released", releasedPointerId);
  }

  return (
    <motion.button
      type="button"
      aria-label={label ?? action}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      animate={{ scale: active ? 0.94 : 1 }}
      transition={{ duration: 0.06 }}
      className={`
        ${buttonBaseClass}
        ${active ? "bg-sky-500 ring-2 ring-white/70" : "active:bg-zinc-600"}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

function UtilityButton({ children, className = "", label, onClick }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.06 }}
      className={`${buttonBaseClass} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function Positioned({ children, className = "" }) {
  return (
    <div
      className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center ${className}`}
    >
      {children}
    </div>
  );
}

function Stick({ name, onSend, className = "" }) {
  const stickRef = useRef(null);
  const pointerId = useRef(null);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function sendStick(x, y) {
    onSend({
      type: "stick",
      stick: name,
      x,
      y,
    });
  }

  function move(event) {
    if (pointerId.current !== event.pointerId || !stickRef.current) return;

    event.preventDefault();

    const rect = stickRef.current.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) / 2;
    const maxDistance = Math.max(1, radius * 0.48);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    const x = Number((dx / maxDistance).toFixed(2));
    const y = Number((-dy / maxDistance).toFixed(2));

    setPos({ x: dx, y: dy });
    sendStick(x, y);
  }

  function start(event) {
    event.preventDefault();

    if (pointerId.current !== null) return;

    pointerId.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can be unavailable on some mobile browser paths.
    }

    setActive(true);
    move(event);
  }

  function end(event) {
    event?.preventDefault();

    if (pointerId.current === null) return;
    if (event && pointerId.current !== event.pointerId) return;

    pointerId.current = null;
    setActive(false);
    setPos({ x: 0, y: 0 });
    sendStick(0, 0);
  }

  return (
    <div
      ref={stickRef}
      aria-label={`${name} analog stick`}
      role="application"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      className={`
        relative aspect-square max-h-full max-w-full overflow-hidden rounded-full
        border-[3px] border-white/40 bg-zinc-950
        shadow-[0_12px_26px_rgba(0,0,0,0.75),inset_0_0_30px_rgba(255,255,255,0.14)]
        ${active ? "ring-2 ring-sky-300/80" : ""}
        ${className}
      `}
    >
      <div className="pointer-events-none absolute inset-[17%] rounded-full border border-white/15" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[43%] -translate-x-1/2 -translate-y-1/2">
        <motion.div
          animate={{ x: pos.x, y: pos.y }}
          transition={{ duration: 0.04 }}
          className="
            h-full w-full rounded-full border border-white/35 bg-zinc-500
            shadow-[0_8px_18px_rgba(0,0,0,0.7),inset_0_2px_8px_rgba(255,255,255,0.35)]
          "
        />
      </div>
    </div>
  );
}

function DPad({ onSend }) {
  return (
    <div
      className="
        grid aspect-square w-[clamp(7.6rem,39svh,14.5rem)] max-h-full max-w-full
        grid-cols-3 grid-rows-3 gap-[clamp(0.28rem,1.15svh,0.65rem)]
      "
    >
      <div />
      <ControllerButton
        action="up"
        label="D-pad up"
        onSend={onSend}
        className="rounded-2xl"
      />
      <div />

      <ControllerButton
        action="left"
        label="D-pad left"
        onSend={onSend}
        className="rounded-2xl"
      />
      <div className="rounded-2xl border border-white/10 bg-black/45" />
      <ControllerButton
        action="right"
        label="D-pad right"
        onSend={onSend}
        className="rounded-2xl"
      />

      <div />
      <ControllerButton
        action="down"
        label="D-pad down"
        onSend={onSend}
        className="rounded-2xl"
      />
      <div />
    </div>
  );
}

function ActionButtons({ onSend }) {
  const labelClass = "text-[clamp(1.45rem,5.4svh,3.05rem)] font-black";

  return (
    <div
      className="
        grid aspect-square w-[clamp(7.6rem,39svh,14.5rem)] max-h-full max-w-full
        grid-cols-3 grid-rows-3 gap-[clamp(0.28rem,1.15svh,0.65rem)]
      "
    >
      <div />
      <ControllerButton
        action="y"
        onSend={onSend}
        className={`rounded-full ${labelClass}`}
      >
        Y
      </ControllerButton>
      <div />

      <ControllerButton
        action="x"
        onSend={onSend}
        className={`rounded-full ${labelClass}`}
      >
        X
      </ControllerButton>
      <div className="rounded-full border border-white/10 bg-black/45" />
      <ControllerButton
        action="b"
        onSend={onSend}
        className={`rounded-full ${labelClass}`}
      >
        B
      </ControllerButton>

      <div />
      <ControllerButton
        action="a"
        onSend={onSend}
        className={`rounded-full ${labelClass}`}
      >
        A
      </ControllerButton>
      <div />
    </div>
  );
}

function RoundLabel({ action, children, onSend }) {
  return (
    <ControllerButton
      action={action}
      onSend={onSend}
      className="
        aspect-square w-[clamp(2.45rem,8.6svh,4.15rem)] rounded-full
        text-[clamp(0.82rem,2.85svh,1.3rem)] font-black
      "
    >
      {children}
    </ControllerButton>
  );
}

function IconControllerButton({ action, children, label, onSend }) {
  return (
    <ControllerButton
      action={action}
      label={label}
      onSend={onSend}
      className="aspect-square w-[clamp(2.05rem,7.2svh,3.15rem)] rounded-full"
    >
      {children}
    </ControllerButton>
  );
}

function CenterButton({ action, children, label, onSend }) {
  return (
    <ControllerButton
      action={action}
      label={label}
      onSend={onSend}
      className="aspect-square w-[clamp(2.55rem,9.6svh,4.35rem)] rounded-full"
    >
      {children}
    </ControllerButton>
  );
}

export default function App() {
  const socketRef = useRef(null);
  const pressedButtonsRef = useRef(new Set());
  const [connected, setConnected] = useState(false);
  const [playerNumber, setPlayerNumber] = useState(null);
  const [rejectedReason, setRejectedReason] = useState("");
  const [players, setPlayers] = useState([]);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      setPlayerNumber(null);
      setRejectedReason("");
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setPlayerNumber(null);
      setRejectedReason("");
      setPlayers([]);
    });
    socket.on("player-assigned", ({ playerNumber: assignedPlayerNumber }) => {
      setPlayerNumber(assignedPlayerNumber);
      setRejectedReason("");
    });
    socket.on("player-rejected", ({ reason }) => {
      setPlayerNumber(null);
      setRejectedReason(reason ?? "No free player slots");
    });
    socket.on("players-updated", ({ players: updatedPlayers = [] }) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    function syncFullscreenState() {
      setFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  function send(data, debug = {}) {
    if (data.type === "button") {
      const pressedButtons = pressedButtonsRef.current;
      const isPressed = pressedButtons.has(data.action);
      const pointerText = `pointerId=${debug.pointerId ?? "none"}`;

      if (data.state === "pressed") {
        if (isPressed) {
          console.log(
            `FRONTEND IGNORED DUPLICATE PRESS: ${data.action} ${pointerText}`,
          );
          return;
        }
        pressedButtons.add(data.action);
      }

      if (data.state === "released") {
        if (!isPressed) {
          console.log(
            `FRONTEND IGNORED DUPLICATE RELEASE: ${data.action} ${pointerText}`,
          );
          return;
        }
        pressedButtons.delete(data.action);
      }
    }

    socketRef.current?.emit("control", {
      ...data,
      time: Date.now(),
    });
  }

  function getStatusText() {
    if (!connected) return "Disconnected";
    if (playerNumber) return `Connected • Player ${playerNumber}`;
    if (rejectedReason) return "Waiting • no free slots";
    return "Connected • assigning player";
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await document.documentElement.requestFullscreen();

      if (screen.orientation?.lock) {
        try {
          await screen.orientation.lock("landscape");
        } catch {
          // Orientation lock support varies across mobile browsers.
        }
      }
    } catch (error) {
      console.log("Fullscreen failed:", error);
    }
  }

  return (
    <main className="controller-safe-area h-[100svh] w-[100vw] overflow-hidden bg-black text-white">
      <div className="hidden h-full w-full place-items-center bg-black p-6 text-center text-[clamp(1.2rem,4svh,2rem)] font-bold portrait:grid">
        Rotate your phone sideways.
      </div>

      <div className="hidden h-full w-full landscape:block">
        <div className="relative h-full w-full overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#07080a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="absolute left-[clamp(0.55rem,1.4vw,1rem)] top-[clamp(0.45rem,1.4svh,0.8rem)] z-20 flex items-center gap-2 text-[clamp(0.68rem,2.2svh,0.95rem)] font-bold text-white/85">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected && !rejectedReason ? "bg-emerald-400" : "bg-red-500"
              }`}
            />
            <span>{getStatusText()}</span>
            <span className="text-white/45">{players.length}/4</span>
          </div>

          <div className="absolute left-1/2 top-[8%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[clamp(0.35rem,1vw,0.75rem)]">
            <IconControllerButton action="settings" label="Settings" onSend={send}>
              <Settings className="h-[52%] w-[52%]" />
            </IconControllerButton>
            <IconControllerButton action="select" label="Select" onSend={send}>
              <Circle className="h-[47%] w-[47%]" />
            </IconControllerButton>
            <IconControllerButton action="start" label="Start" onSend={send}>
              <Circle className="h-[47%] w-[47%] fill-white/15" />
            </IconControllerButton>
            <IconControllerButton action="wireless" label="Wireless" onSend={send}>
              <Wifi className="h-[52%] w-[52%]" />
            </IconControllerButton>
            <UtilityButton
              label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              className="aspect-square w-[clamp(2.05rem,7.2svh,3.15rem)] rounded-full"
            >
              {fullscreen ? (
                <Minimize className="h-[52%] w-[52%]" />
              ) : (
                <Maximize className="h-[52%] w-[52%]" />
              )}
            </UtilityButton>
          </div>

          <Positioned className="left-[20%] top-[29%]">
            <DPad onSend={send} />
          </Positioned>

          <Positioned className="left-[7.5%] top-[43%]">
            <RoundLabel action="ls_button" onSend={send}>
              LS
            </RoundLabel>
          </Positioned>

          <Positioned className="left-[15%] top-[72%]">
            <Stick
              name="left"
              onSend={send}
              className="w-[clamp(6.3rem,31svh,11.7rem)]"
            />
          </Positioned>

          <Positioned className="left-[34%] top-[68%]">
            <div className="flex flex-col gap-[clamp(0.45rem,1.6svh,0.8rem)]">
              <RoundLabel action="lb" onSend={send}>
                LB
              </RoundLabel>
              <RoundLabel action="lt" onSend={send}>
                LT
              </RoundLabel>
            </div>
          </Positioned>

          <Positioned className="left-1/2 top-[43%]">
            <div className="flex items-center justify-center gap-[clamp(0.55rem,1.7vw,1.05rem)]">
              <CenterButton action="back" label="Back" onSend={send}>
                <ArrowLeft className="h-[55%] w-[55%]" />
              </CenterButton>
              <CenterButton action="home" label="Home" onSend={send}>
                <RotateCcw className="h-[55%] w-[55%]" />
              </CenterButton>
              <CenterButton action="play" label="Play" onSend={send}>
                <Play className="h-[55%] w-[55%] translate-x-[3%]" />
              </CenterButton>
            </div>
          </Positioned>

          <Positioned className="left-[72%] top-[29%]">
            <Stick
              name="right"
              onSend={send}
              className="w-[clamp(6.3rem,31svh,11.7rem)]"
            />
          </Positioned>

          <Positioned className="left-[92.5%] top-[43%]">
            <RoundLabel action="rs_button" onSend={send}>
              RS
            </RoundLabel>
          </Positioned>

          <Positioned className="left-[68.5%] top-[68%]">
            <div className="flex flex-col gap-[clamp(0.45rem,1.6svh,0.8rem)]">
              <RoundLabel action="rb" onSend={send}>
                RB
              </RoundLabel>
              <RoundLabel action="rt" onSend={send}>
                RT
              </RoundLabel>
            </div>
          </Positioned>

          <Positioned className="left-[84%] top-[69%]">
            <ActionButtons onSend={send} />
          </Positioned>
        </div>
      </div>
    </main>
  );
}
