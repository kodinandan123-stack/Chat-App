# 💬 Pulse Chat

A modern real-time chat application built with **Node.js**, **Express**, and **Socket.io**.

---

## 📁 Folder Structure

Your files **must** be arranged exactly like this:

```
chat-app/
├── server.js
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

> ⚠️ If the `public` folder is missing, create it and move `index.html`, `style.css`, `script.js` inside it.

---

## 🚀 How to Run

### Step 1 — Install Node.js
Download from 👉 **https://nodejs.org** (choose LTS version) and install it.

To confirm it is installed, open Command Prompt and run:
```
node --version
npm --version
```
Both should print a version number.

### Step 2 — Open Command Prompt in your chat-app folder
- Open the `chat-app` folder in File Explorer
- Click the address bar at the top
- Type `cmd` and press Enter

### Step 3 — Install dependencies (only once)
```
npm install
```

### Step 4 — Start the server
```
node server.js
```

You should see:
```
  ✦ Pulse Chat running at http://localhost:3000
```

### Step 5 — Open in browser
```
http://localhost:3000
```

> ✅ Always open via `http://localhost:3000`
> ❌ Never open `index.html` directly or use VS Code Live Server (port 5500)

### Step 6 — Test with multiple users
Open **2 or 3 browser tabs** all pointing to `http://localhost:3000`.
Each tab = a different user. Enter different names and start chatting!

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'server.js'` | `server.js` is not in the current folder | Run `dir` to check, then `cd` into the correct folder |
| `Cannot GET /` | `public` folder missing or `index.html` not inside it | Create `public/` folder and put `index.html`, `style.css`, `script.js` inside it |
| No CSS / plain text UI | Opened `index.html` directly in browser | Use `http://localhost:3000` instead |
| `npm` not recognized | Node.js not installed | Download from nodejs.org and restart Command Prompt |
| Port 3000 already in use | Another app is using port 3000 | Change `3000` to `3001` in `server.js` and try again |
| App shows "Connecting…" forever | Server not running | Make sure `node server.js` is running in Command Prompt |

---

## ✨ Features

- 💬 Real-time messaging with Socket.io
- 👤 Username entry before joining
- 🏠 3 chat rooms — General, Tech, Random
- ✅ User joined / left notifications
- ⌨️ Typing indicator with animated dots
- 👥 Online users list with colour avatars
- 🔔 Sound ping for new messages
- 📱 Fully responsive — works on mobile
- 🎨 Dark modern UI — no external fonts needed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Server | Express |
| Real-time | Socket.io |
| Frontend | HTML, CSS, JavaScript |

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  }
}
```

Install with:
```
npm install
```

---

## 🌐 Uploading to GitHub

Upload only these files — **do NOT upload** `node_modules`:

```
chat-app/
├── server.js
├── package.json
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

Also create a `.gitignore` file with:
```
node_modules/
```

---

> Built with ❤️ using Node.js + Socket.io
