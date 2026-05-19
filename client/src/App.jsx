import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Maximize,
  Minimize,
  Play,
  RotateCcw,
  Settings,
  Wifi,
} from "lucide-react";

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

const buttonBaseClass = `
  flex select-none items-center justify-center
  border border-white/30 bg-zinc-800 text-white
  shadow-[0_8px_20px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.16)]
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
  const pointerId = useRef(null);

  function emitState(state) {
    onSend({
      type: "button",
      action,
      state,
    });
  }

  function handlePointerDown(event) {
    event.preventDefault();

    if (pointerId.current !== null) return;

    pointerId.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail on older mobile browsers.
    }

    setActive(true);
    navigator.vibrate?.(12);
    emitState("pressed");
  }

  function handlePointerRelease(event) {
    event?.preventDefault();

    if (pointerId.current === null) return;
    if (event && pointerId.current !== event.pointerId) return;

    pointerId.current = null;
    setActive(false);
    emitState("released");
  }

  return (
    <motion.button
      type="button"
      aria-label={label ?? action}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerRelease}
      onPointerCancel={handlePointerRelease}
      onLostPointerCapture={handlePointerRelease}
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

  function updateFromPointer(event) {
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

  function handlePointerDown(event) {
    event.preventDefault();

    if (pointerId.current !== null) return;

    pointerId.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture can fail on older mobile browsers.
    }

    setActive(true);
    updateFromPointer(event);
  }

  function handlePointerEnd(event) {
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
      onPointerDown={handlePointerDown}
      onPointerMove={updateFromPointer}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      className={`
        relative aspect-square max-h-full max-w-full overflow-hidden rounded-full
        border-[3px] border-white/35 bg-zinc-950
        shadow-[0_12px_26px_rgba(0,0,0,0.75),inset_0_0_28px_rgba(255,255,255,0.13)]
        ${active ? "ring-2 ring-sky-300/80" : ""}
        ${className}
      `}
    >
      <div className="pointer-events-none absolute inset-[18%] rounded-full border border-white/15" />
      <motion.div
        animate={{ x: pos.x, y: pos.y }}
        transition={{ duration: 0.04 }}
        className="
          pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[43%]
          -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35
          bg-zinc-500 shadow-[0_8px_18px_rgba(0,0,0,0.7),inset_0_2px_8px_rgba(255,255,255,0.35)]
        "
      />
    </div>
  );
}

function DPad({ onSend }) {
  const iconClass = "h-[62%] w-[62%] stroke-[3]";

  return (
    <div
      className="
        grid aspect-square w-[clamp(8rem,42svh,15rem)] max-h-full max-w-full
        grid-cols-3 grid-rows-3 gap-[clamp(0.25rem,1svh,0.6rem)]
      "
    >
      <div />
      <ControllerButton
        action="up"
        label="D-pad up"
        onSend={onSend}
        className="rounded-2xl"
      >
        <ChevronUp className={iconClass} />
      </ControllerButton>
      <div />

      <ControllerButton
        action="left"
        label="D-pad left"
        onSend={onSend}
        className="rounded-2xl"
      >
        <ChevronLeft className={iconClass} />
      </ControllerButton>
      <div className="rounded-2xl border border-white/10 bg-black/35" />
      <ControllerButton
        action="right"
        label="D-pad right"
        onSend={onSend}
        className="rounded-2xl"
      >
        <ChevronRight className={iconClass} />
      </ControllerButton>

      <div />
      <ControllerButton
        action="down"
        label="D-pad down"
        onSend={onSend}
        className="rounded-2xl"
      >
        <ChevronDown className={iconClass} />
      </ControllerButton>
      <div />
    </div>
  );
}

function ActionButtons({ onSend }) {
  const actionTextClass = "text-[clamp(1.45rem,5.4svh,3rem)] font-black";

  return (
    <div
      className="
        grid aspect-square w-[clamp(8rem,42svh,15rem)] max-h-full max-w-full
        grid-cols-3 grid-rows-3 gap-[clamp(0.25rem,1svh,0.6rem)]
      "
    >
      <div />
      <ControllerButton
        action="y"
        onSend={onSend}
        className={`rounded-full ${actionTextClass}`}
      >
        Y
      </ControllerButton>
      <div />

      <ControllerButton
        action="x"
        onSend={onSend}
        className={`rounded-full ${actionTextClass}`}
      >
        X
      </ControllerButton>
      <div className="rounded-full border border-white/10 bg-black/35" />
      <ControllerButton
        action="b"
        onSend={onSend}
        className={`rounded-full ${actionTextClass}`}
      >
        B
      </ControllerButton>

      <div />
      <ControllerButton
        action="a"
        onSend={onSend}
        className={`rounded-full ${actionTextClass}`}
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
        aspect-square w-[clamp(2.6rem,9svh,4.2rem)] max-w-full rounded-full
        text-[clamp(0.9rem,3svh,1.35rem)] font-black
      "
    >
      {children}
    </ControllerButton>
  );
}

function CenterButton({ action, children, onSend }) {
  return (
    <ControllerButton
      action={action}
      onSend={onSend}
      className="aspect-square w-[clamp(2.8rem,11svh,4.7rem)] rounded-full"
    >
      {children}
    </ControllerButton>
  );
}

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

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

  function send(data) {
    socketRef.current?.emit("control", {
      ...data,
      time: Date.now(),
    });
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
          // Orientation lock support varies by browser and fullscreen policy.
        }
      }
    } catch (error) {
      console.log("Fullscreen failed:", error);
    }
  }

  return (
    <main className="controller-safe-area h-[100svh] w-full overflow-hidden bg-black text-white">
      <div className="hidden h-full w-full place-items-center bg-black p-6 text-center text-[clamp(1.2rem,4svh,2rem)] font-bold portrait:grid">
        Rotate your phone sideways.
      </div>

      <div className="hidden h-full min-h-0 w-full flex-col overflow-hidden bg-[#07080a] landscape:flex">
        <header
          className="
            grid h-[clamp(2.7rem,12svh,4rem)] shrink-0 grid-cols-[1fr_auto_1fr]
            items-center gap-[clamp(0.35rem,1.2vw,1rem)] px-[clamp(0.45rem,1.5vw,1rem)]
          "
        >
          <div className="flex min-w-0 items-center gap-2 text-[clamp(0.7rem,2.3svh,0.95rem)] font-bold text-white/85">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                connected ? "bg-emerald-400" : "bg-red-500"
              }`}
            />
            <span className="truncate">{connected ? "Connected" : "Disconnected"}</span>
          </div>

          <div className="h-px w-[clamp(2rem,8vw,6rem)] bg-white/15" />

          <div className="flex justify-end gap-[clamp(0.35rem,1vw,0.7rem)]">
            <ControllerButton
              action="settings"
              label="Settings"
              onSend={send}
              className="aspect-square w-[clamp(2.25rem,9svh,3.35rem)] rounded-full"
            >
              <Settings className="h-[52%] w-[52%]" />
            </ControllerButton>
            <ControllerButton
              action="wireless"
              label="Wireless"
              onSend={send}
              className="aspect-square w-[clamp(2.25rem,9svh,3.35rem)] rounded-full"
            >
              <Wifi className="h-[52%] w-[52%]" />
            </ControllerButton>
            <UtilityButton
              label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              className="aspect-square w-[clamp(2.25rem,9svh,3.35rem)] rounded-full"
            >
              {fullscreen ? (
                <Minimize className="h-[52%] w-[52%]" />
              ) : (
                <Maximize className="h-[52%] w-[52%]" />
              )}
            </UtilityButton>
          </div>
        </header>

        <div
          className="
            grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr]
            gap-[clamp(0.35rem,1vw,1rem)] px-[clamp(0.45rem,1.6vw,1.1rem)]
            pb-[clamp(0.45rem,1.5svh,0.9rem)]
          "
        >
          <section
            className="
              grid min-h-0 min-w-0 grid-cols-[0.82fr_1.18fr] grid-rows-2
              items-center gap-x-[clamp(0.35rem,1.2vw,1rem)] gap-y-[clamp(0.3rem,1svh,0.7rem)]
              pl-[clamp(0.1rem,0.8vw,0.7rem)]
            "
          >
            <div className="self-start justify-self-start pt-[clamp(0.1rem,1svh,0.55rem)]">
              <RoundLabel action="ls_button" onSend={send}>
                LS
              </RoundLabel>
            </div>

            <div className="flex min-h-0 min-w-0 items-center justify-center">
              <DPad onSend={send} />
            </div>

            <div className="flex min-h-0 min-w-0 items-center justify-center">
              <Stick
                name="left"
                onSend={send}
                className="w-[clamp(6.8rem,32svh,12rem)]"
              />
            </div>

            <div className="flex min-h-0 min-w-0 items-center justify-center gap-[clamp(0.35rem,1.1vw,0.8rem)]">
              <RoundLabel action="lb" onSend={send}>
                LB
              </RoundLabel>
              <RoundLabel action="lt" onSend={send}>
                LT
              </RoundLabel>
            </div>
          </section>

          <section className="flex w-[clamp(4.75rem,12vw,7rem)] min-h-0 flex-col items-center justify-center gap-[clamp(0.4rem,1.8svh,0.8rem)]">
            <CenterButton action="back" onSend={send}>
              <ArrowLeft className="h-[55%] w-[55%]" />
            </CenterButton>
            <CenterButton action="home" onSend={send}>
              <RotateCcw className="h-[55%] w-[55%]" />
            </CenterButton>
            <CenterButton action="play" onSend={send}>
              <Play className="h-[55%] w-[55%] translate-x-[3%]" />
            </CenterButton>
          </section>

          <section
            className="
              grid min-h-0 min-w-0 grid-cols-[0.82fr_1.18fr] grid-rows-2
              items-center gap-x-[clamp(0.35rem,1.2vw,1rem)] gap-y-[clamp(0.3rem,1svh,0.7rem)]
              pr-[clamp(0.35rem,1.6vw,1.2rem)]
            "
          >
            <div className="self-start justify-self-end pt-[clamp(0.1rem,1svh,0.55rem)]">
              <RoundLabel action="rs_button" onSend={send}>
                RS
              </RoundLabel>
            </div>

            <div className="flex min-h-0 min-w-0 items-center justify-center">
              <Stick
                name="right"
                onSend={send}
                className="w-[clamp(6.8rem,32svh,12rem)]"
              />
            </div>

            <div className="flex min-h-0 min-w-0 items-center justify-center gap-[clamp(0.35rem,1.1vw,0.8rem)]">
              <RoundLabel action="rb" onSend={send}>
                RB
              </RoundLabel>
              <RoundLabel action="rt" onSend={send}>
                RT
              </RoundLabel>
            </div>

            <div className="flex min-h-0 min-w-0 items-center justify-center">
              <ActionButtons onSend={send} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
