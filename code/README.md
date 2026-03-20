# 💬 Pulse Chat

A modern real-time chat application built with **Node.js**, **Express**, and **Socket.io**.  
Features a sleek dark UI, multiple chat rooms, typing indicators, and sound notifications.

---

## 📸 Preview

```
┌─────────────────────────────────────────────────┐
│  ● Pulse                              # General  │
├──────────────┬──────────────────────────────────┤
│  Rooms       │                                  │
│  # General ◀ │   Alex  10:24 AM                 │
│  # Tech      │   ╭─────────────────────╮        │
│  # Random    │   │ Hey everyone! 👋    │        │
│              │   ╰─────────────────────╯        │
│  Online  2   │                                  │
│  ● Alex      │        ╭──────────────────────╮  │
│  ● Sam       │        │ Hey Alex, welcome!   │  │
│              │        ╰──────────────────────╯  │
│              │  Sam is typing ...               │
│              ├──────────────────────────────────┤
│              │  Type a message…          [ ➤ ]  │
└──────────────┴──────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone or Download
```bash
git clone https://github.com/your-username/pulse-chat.git
cd pulse-chat
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
node server.js
```

### 4. Open in Browser
```
http://localhost:3000
```

> 💡 Open **multiple tabs** to simulate multiple users chatting in real time!

---

## 📁 Project Structure

```
pulse-chat/
├── server.js           # Node.js + Express + Socket.io backend
├── package.json        # Project dependencies
└── public/             # Frontend (served as static files)
    ├── index.html      # App markup (join screen + chat UI)
    ├── style.css       # Styling (dark theme, responsive)
    └── script.js       # Socket.io client logic
```

---

## ✨ Features

### Core
- ✅ Real-time messaging with Socket.io
- ✅ Username entry before joining
- ✅ "User joined" and "User left" notifications
- ✅ Your messages vs others — different bubble styles
- ✅ Timestamp on every message
- ✅ Empty message prevention

### Extra
- 🎯 **Typing indicator** — "Alex is typing…" with animated dots
- 🏠 **3 Chat Rooms** — General, Tech, Random (switch anytime)
- 🔔 **Sound notification** for new messages (Web Audio API)
- 🎨 **Unique color** assigned to each user automatically
- 👥 **Online users list** in the sidebar
- 📱 **Fully responsive** — works on mobile with slide-in sidebar
- 🔒 **XSS-safe** — all messages are HTML-escaped

---

## 🛠️ Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Runtime   | Node.js                 |
| Server    | Express 4               |
| Real-time | Socket.io 4             |
| Frontend  | HTML5, CSS3, Vanilla JS |
| Fonts     | Google Fonts (Plus Jakarta Sans + Fraunces) |
| Audio     | Web Audio API (no files needed) |

---

## 📡 Socket.io Events

### Client → Server

| Event        | Payload                        | Description                  |
|--------------|--------------------------------|------------------------------|
| `join`       | `{ username, room }`           | User joins a room            |
| `message`    | `"text string"`                | Send a chat message          |
| `typing`     | `true / false`                 | Typing indicator state       |
| `switchRoom` | `"RoomName"`                   | Switch to a different room   |

### Server → Client

| Event          | Payload                                  | Description                       |
|----------------|------------------------------------------|-----------------------------------|
| `joined`       | `{ username, room, color, rooms }`       | Confirm join + send config        |
| `message`      | `{ id, username, color, text, time }`    | Broadcast a message               |
| `notification` | `{ type, message }`                      | User joined/left notification     |
| `typing`       | `{ username, isTyping }`                 | Typing indicator from others      |
| `userList`     | `[{ username, color }]`                  | Updated list of users in room     |
| `roomSwitched` | `{ room }`                               | Confirm room switch               |

---

## ⚙️ Configuration

The server runs on port **3000** by default. To change it, set the `PORT` environment variable:

```bash
PORT=8080 node server.js
```

---

## 🧩 How to Extend

**Add more rooms** — edit the `ROOMS` array in `server.js`:
```js
const ROOMS = ['General', 'Tech', 'Random', 'Gaming', 'Music'];
```

**Change the port** — set environment variable or edit `server.js`:
```js
const PORT = process.env.PORT || 3000;
```

**Deploy to Railway / Render / Heroku** — just push the repo, `npm start` is already configured in `package.json`.

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

Install with:
```bash
npm install
```

For development with auto-restart:
```bash
npm run dev
```

---

## 📄 License

MIT — free to use, modify, and distribute.

---

> Built with ❤️ using Node.js + Socket.io
