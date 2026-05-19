import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { motion } from "framer-motion";
import {
  Settings,
  Circle,
  Wifi,
  ArrowLeft,
  RotateCcw,
  Play,
} from "lucide-react";

const SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

function ControllerButton({ action, children, className = "", onSend }) {
  const [active, setActive] = useState(false);
  const pointerId = useRef(null);

  function press(event) {
    event.preventDefault();
    if (pointerId.current !== null) return;

    pointerId.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    setActive(true);

    onSend({
      type: "button",
      action,
      state: "pressed",
    });
  }

  function release(event) {
    event?.preventDefault();

    if (pointerId.current === null) return;

    pointerId.current = null;
    setActive(false);

    onSend({
      type: "button",
      action,
      state: "released",
    });
  }

  return (
    <motion.button
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      animate={{ scale: active ? 0.92 : 1 }}
      transition={{ duration: 0.06 }}
      className={`
        flex items-center justify-center
        border border-white/25
        bg-zinc-800
        text-white font-black
        shadow-[0_8px_18px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]
        ${active ? "bg-zinc-500 ring-2 ring-white/60" : ""}
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
}

function Stick({ name, onSend, className = "" }) {
  const stickRef = useRef(null);
  const pointerId = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  function send(x, y) {
    onSend({
      type: "stick",
      stick: name,
      x,
      y,
    });
  }

  function move(event) {
    if (pointerId.current !== event.pointerId) return;

    const rect = stickRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const maxDistance = radius * 0.45;

    const centerX = rect.left + radius;
    const centerY = rect.top + radius;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;

    const distance = Math.hypot(dx, dy);

    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }

    const x = +(dx / maxDistance).toFixed(2);
    const y = +(-dy / maxDistance).toFixed(2);

    setPos({ x: dx, y: dy });
    send(x, y);
  }

  function start(event) {
    event.preventDefault();

    pointerId.current = event.pointerId;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}

    setActive(true);
    move(event);
  }

  function end(event) {
    event?.preventDefault();

    pointerId.current = null;
    setPos({ x: 0, y: 0 });
    setActive(false);
    send(0, 0);
  }

  return (
    <div
      ref={stickRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      className={`
        relative aspect-square rounded-full
        border-[3px] border-white/35
        bg-black
        shadow-[0_12px_25px_rgba(0,0,0,0.7),inset_0_0_22px_rgba(255,255,255,0.12)]
        ${active ? "ring-2 ring-white/50" : ""}
        ${className}
      `}
    >
      <motion.div
        animate={{ x: pos.x, y: pos.y }}
        transition={{ duration: 0.04 }}
        className="
          pointer-events-none
          absolute left-1/2 top-1/2
          aspect-square w-[42%]
          -translate-x-1/2 -translate-y-1/2
          rounded-full
          border border-white/25
          bg-zinc-500
          shadow-[0_8px_18px_rgba(0,0,0,0.7),inset_0_2px_6px_rgba(255,255,255,0.3)]
        "
      />
    </div>
  );
}

function DPad({ onSend }) {
  return (
    <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-[6%]">
      <div />
      <ControllerButton action="up" onSend={onSend} className="rounded-2xl" />
      <div />

      <ControllerButton action="left" onSend={onSend} className="rounded-2xl" />
      <div />
      <ControllerButton action="right" onSend={onSend} className="rounded-2xl" />

      <div />
      <ControllerButton action="down" onSend={onSend} className="rounded-2xl" />
      <div />
    </div>
  );
}

function ActionButtons({ onSend }) {
  return (
    <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-[6%]">
      <div />
      <ControllerButton
        action="y"
        onSend={onSend}
        className="rounded-full text-[clamp(1.4rem,5vw,3.8rem)]"
      >
        Y
      </ControllerButton>
      <div />

      <ControllerButton
        action="x"
        onSend={onSend}
        className="rounded-full text-[clamp(1.4rem,5vw,3.8rem)]"
      >
        X
      </ControllerButton>
      <div />
      <ControllerButton
        action="b"
        onSend={onSend}
        className="rounded-full text-[clamp(1.4rem,5vw,3.8rem)]"
      >
        B
      </ControllerButton>

      <div />
      <ControllerButton
        action="a"
        onSend={onSend}
        className="rounded-full text-[clamp(1.4rem,5vw,3.8rem)]"
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
        aspect-square w-[clamp(3.2rem,9vh,5.4rem)]
        rounded-full
        text-[clamp(1.5rem,5vh,3.2rem)]
      "
    >
      {children}
    </ControllerButton>
  );
}

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => socket.disconnect();
  }, []);

  function send(data) {
    socketRef.current?.emit("control", {
      ...data,
      time: Date.now(),
    });
  }

  return (
    <main className="controller-safe-area h-[100svh] w-screen overflow-hidden bg-black text-white">
      <div className="hidden h-full w-full place-items-center bg-black p-8 text-center text-2xl font-bold portrait:grid">
        Rotate your phone sideways.
      </div>

      <div className="hidden h-full w-full landscape:flex">
        <div
          className="
            relative flex h-full w-full flex-col overflow-hidden
            rounded-3xl border border-white/15
            bg-[#101114]
            shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
          "
        >
          <div className="absolute left-4 top-3 z-20 text-[clamp(0.75rem,2.5vh,1.1rem)] text-white/80">
            {connected ? "Connected" : "Disconnected"}
          </div>

          {/* TOP BAR */}
          <div className="flex h-[14%] items-center justify-center gap-[clamp(1rem,4vw,4rem)]">
            <ControllerButton
              action="settings"
              onSend={send}
              className="aspect-square h-[55%] rounded-full"
            >
              <Settings className="h-[52%] w-[52%]" />
            </ControllerButton>

            <ControllerButton
              action="select"
              onSend={send}
              className="aspect-square h-[55%] rounded-full"
            >
              <Circle className="h-[48%] w-[48%]" />
            </ControllerButton>

            <ControllerButton
              action="start"
              onSend={send}
              className="aspect-square h-[55%] rounded-full"
            >
              <Circle className="h-[48%] w-[48%]" />
            </ControllerButton>

            <ControllerButton
              action="wireless"
              onSend={send}
              className="aspect-square h-[55%] rounded-full"
            >
              <Wifi className="h-[48%] w-[48%]" />
            </ControllerButton>
          </div>

          {/* MAIN */}
          <div className="grid min-h-0 flex-1 grid-cols-[1.25fr_0.75fr_1.25fr] px-[2vw] pb-[2vh]">
            {/* LEFT SIDE */}
            <section className="grid h-full grid-cols-[0.7fr_1.1fr_0.8fr] grid-rows-2 items-center gap-[1vw]">
              <div className="flex items-center justify-center">
                <RoundLabel action="ls_button" onSend={send}>
                  LS
                </RoundLabel>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-[clamp(6rem,28vh,12rem)]">
                  <DPad onSend={send} />
                </div>
              </div>

              <div />

              <div className="flex items-center justify-center">
                <Stick name="left" onSend={send} className="w-[clamp(7rem,34vh,14rem)]" />
              </div>

              <div />

              <div className="flex flex-col items-center justify-center gap-[2vh]">
                <RoundLabel action="lb" onSend={send}>
                  LB
                </RoundLabel>
                <RoundLabel action="lt" onSend={send}>
                  LT
                </RoundLabel>
              </div>
            </section>

            {/* CENTER */}
            <section className="flex h-full items-center justify-center">
              <div className="flex items-center justify-center gap-[clamp(0.8rem,2vw,2rem)]">
                <ControllerButton
                  action="back"
                  onSend={send}
                  className="aspect-square w-[clamp(3.2rem,12vh,6rem)] rounded-full"
                >
                  <ArrowLeft className="h-[55%] w-[55%]" />
                </ControllerButton>

                <ControllerButton
                  action="home"
                  onSend={send}
                  className="aspect-square w-[clamp(3.2rem,12vh,6rem)] rounded-full"
                >
                  <RotateCcw className="h-[55%] w-[55%]" />
                </ControllerButton>

                <ControllerButton
                  action="play"
                  onSend={send}
                  className="aspect-square w-[clamp(3.2rem,12vh,6rem)] rounded-full"
                >
                  <Play className="h-[55%] w-[55%]" />
                </ControllerButton>
              </div>
            </section>

            {/* RIGHT SIDE */}
            <section className="grid h-full grid-cols-[0.8fr_1.1fr_0.7fr] grid-rows-2 items-center gap-[1vw]">
              <div />

              <div className="flex items-center justify-center">
                <Stick name="right" onSend={send} className="w-[clamp(7rem,34vh,14rem)]" />
              </div>

              <div className="flex items-center justify-center">
                <RoundLabel action="rs_button" onSend={send}>
                  RS
                </RoundLabel>
              </div>

              <div className="flex flex-col items-center justify-center gap-[2vh]">
                <RoundLabel action="rb" onSend={send}>
                  RB
                </RoundLabel>
                <RoundLabel action="rt" onSend={send}>
                  RT
                </RoundLabel>
              </div>

              <div />

              <div className="flex items-center justify-center">
                <div className="w-[clamp(7rem,33vh,14rem)]">
                  <ActionButtons onSend={send} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}