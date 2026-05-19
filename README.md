# Phone Controller

Phone Controller is a local-network web app that turns a phone into a controller for PC games. The PC runs the server, and the phone opens a controller page in the browser. Inputs are sent over the local network and translated into virtual Xbox controller input on the PC.

It was designed mainly for local co-op games such as **Overcooked!** and **Overcooked! 2**.

## Preview

### Controller UI

![Controller UI preview](docs/images/controller-ui-preview.jpg)

### Original design reference

![Design reference](docs/images/design-reference.jpg)

## What it does

- Runs a controller web page on your phone.
- Sends button and analog stick input to your PC using Socket.IO.
- Emulates Xbox-style controller input on Windows.
- Supports fullscreen mode on mobile.
- Supports keeping the phone screen awake while playing, when the browser supports the Screen Wake Lock API.
- Can support multiple phones for local multiplayer, with each phone assigned to its own player/controller slot.
- Works over the same Wi-Fi/LAN network.

## Tech stack

### Backend

- **Node.js** — JavaScript runtime for the PC server.
- **Express** — serves the backend and handles basic HTTP setup.
- **Socket.IO** — real-time communication between the phone and PC.
- **Virtual Xbox controller / ViGEmBus integration** — turns phone input into controller input that games can detect.

### Frontend

- **React** — builds the controller UI as reusable components.
- **Vite** — fast development server for the React frontend.
- **Tailwind CSS** — responsive styling and layout.
- **Framer Motion** — button press animations.
- **Lucide React** — icons for fullscreen, settings, connection, etc.
- **Pointer Events** — multitouch button and stick input on phones.
- **Fullscreen API** — allows the controller to enter fullscreen mode.
- **Screen Wake Lock API** — helps prevent the phone screen from turning off while playing.

## How it works

```text
Phone browser
    ↓
React controller UI
    ↓ Socket.IO events over LAN
Node.js backend on PC
    ↓
Virtual Xbox controller
    ↓
PC game, for example Overcooked
```

Button events look like this:

```js
{
  type: "button",
  action: "a",
  state: "pressed",
  time: Date.now()
}
```

Stick events look like this:

```js
{
  type: "stick",
  stick: "left",
  x: 0.5,
  y: -0.2,
  time: Date.now()
}
```

## Overcooked controls

The default mapping is based on Xbox controls for Overcooked and Overcooked 2.

| Phone control | Xbox control | Overcooked action |
|---|---:|---|
| Left stick | Left Stick | Move |
| D-pad | D-pad | Emotes / menu navigation |
| A | A | Pick up / drop / serve |
| X | X | Interact / chop / wash |
| B | B | Dash / speed boost |
| Y | Y | Cancel / empty action / controller assignment |
| LB / RB | LB / RB | Change chef |
| Start / Play | Start / Menu | Pause |
| Back | Back / View | Scoreboard |
| LS | Left Stick Click | Optional mapping |
| RS | Right Stick Click | Optional mapping |

For **Overcooked 2 throwing**, hold **A** and press **X**.

## Requirements

- Windows PC.
- Node.js installed.
- Phone and PC connected to the same network.
- Windows firewall must allow the backend/frontend ports.
- For Xbox controller emulation, install the required virtual controller driver if your implementation uses one, for example **ViGEmBus**.

## Installation

Clone the project and install dependencies.

```bash
git clone https://github.com/Pepi67/Phone-Controller.git
cd Phone-Controller
npm install
cd client
npm install
```

Then go back to the project root:

```bash
cd ..
```

## Running the app manually

Open two terminals.

### Terminal 1: backend

From the project root:

```bash
npm start
```

### Terminal 2: frontend

From the project root:

```bash
cd client
npm run dev -- --host 0.0.0.0
```

Vite will show something like:

```text
Local:   http://localhost:5173/
Network: http://192.168.0.138:5173/
```

Open the **Network** URL on your phone:

```text
http://YOUR_PC_IP:5173
```

Example:

```text
http://192.168.0.138:5173
```

Do not use `localhost` on your phone. On the phone, `localhost` means the phone itself, not your PC.

## Running with the launcher script

You can create a Windows batch file called `start-app.bat` in the project root:

```bat
@echo off
title Phone Controller Launcher

cd /d "%~dp0"

echo Starting Phone Controller backend...
start "Phone Controller Backend" cmd /k "npm start"

echo Starting Phone Controller frontend...
start "Phone Controller Frontend" cmd /k "cd client && npm run dev -- --host 0.0.0.0"

echo.
echo App started.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Use the Network IP shown in the frontend window on your phone.
echo Example: http://192.168.0.138:5173
echo.
pause
```

Then double-click:

```text
start-app.bat
```

## Multiplayer

The intended multiplayer behavior is:

- First phone = Player 1.
- Second phone = Player 2.
- Third phone = Player 3.
- Fourth phone = Player 4.

Each phone should control its own virtual Xbox controller. If a fifth phone connects, it should be rejected or placed into waiting mode.

## Fullscreen and keep awake

On the phone:

1. Open the controller page.
2. Tap the fullscreen button.
3. Keep Awake should turn on if supported.
4. Rotate the phone to landscape.

For the best experience, add the page to the home screen so it opens more like an app.

## Troubleshooting

### Phone cannot open the page

Check these first:

- Phone and PC are on the same Wi-Fi/network.
- Use the PC network IP, not `localhost`.
- Windows Firewall allows Node.js/Vite.
- Your router is not using guest-network isolation.

### Game does not react to input

Try this:

- Make sure the game window is focused.
- Check whether Windows detects the virtual Xbox controller.
- If the game runs as administrator, run the Node server as administrator too.
- Restart the game after starting the virtual controller backend.

### Buttons double click

The correct behavior is:

```text
button down once
button up once
```

The backend should not treat both `pressed` and `released` as separate clicks. For Xbox controller mode, `pressed` should send button down, and `released` should send button up.

### Phone screen turns off

The app uses the Screen Wake Lock API if supported by the browser. If it still sleeps:

- Use Chrome or a browser with Wake Lock support.
- Tap the Keep Awake button after opening the page.
- Keep the page active and visible.
- Install the page to the home screen if possible.

## Project structure

```text
Phone-Controller/
├─ server.js
├─ package.json
├─ start-app.bat
├─ client/
│  ├─ package.json
│  ├─ vite.config.js
│  └─ src/
│     ├─ App.jsx
│     └─ index.css
└─ docs/
   └─ images/
      ├─ controller-ui-preview.jpg
      └─ design-reference.jpg
```

## Development notes

- Keep frontend controller events simple and consistent.
- Keep duplicate prevention on the backend, not only in React.
- Keep input state per player/socket for multiplayer.
- Always release held buttons and reset sticks when a phone disconnects.
- Avoid layouts that depend on one exact phone resolution.
