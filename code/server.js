/**
 * ╔══════════════════════════════════════════╗
 *  Pulse Chat — server.js
 *  Node.js + Express + Socket.io backend
 * ╚══════════════════════════════════════════╝
 *
 * Run:
 *   npm install
 *   node server.js
 *
 * Then open http://localhost:3000 in your browser.
 */

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');

/* ─── App Setup ─────────────────────────────── */
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }          // Allow all origins for local dev
});

const PORT = process.env.PORT || 3000;

/* ─── Serve Static Frontend ──────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ─── In-Memory State ────────────────────────── */
// Map of socket.id → { username, room, color }
const users = new Map();

// Available chat rooms
const ROOMS = ['General', 'Tech', 'Random'];

// Assign a consistent color per user (cycles through palette)
const USER_COLORS = [
  '#64b5f6', '#81c784', '#ffb74d', '#f06292',
  '#ba68c8', '#4dd0e1', '#aed581', '#ff8a65',
];
let colorIndex = 0;
function nextColor() {
  const c = USER_COLORS[colorIndex % USER_COLORS.length];
  colorIndex++;
  return c;
}

/* ─── Helper: room user list ─────────────────── */
function getRoomUsers(room) {
  const list = [];
  users.forEach(u => {
    if (u.room === room) list.push({ username: u.username, color: u.color });
  });
  return list;
}

/* ─── Socket.io Connection Handler ──────────── */
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  /* ── 1. User Joins a Room ─── */
  socket.on('join', ({ username, room }) => {

    // Validate
    if (!username || !username.trim()) return;
    if (!ROOMS.includes(room)) room = 'General';

    username = username.trim().slice(0, 24); // max 24 chars

    // Store user info
    users.set(socket.id, {
      username,
      room,
      color: nextColor(),
    });

    // Join Socket.io room
    socket.join(room);

    const user = users.get(socket.id);

    console.log(`  → ${username} joined [${room}]`);

    // Confirm join to the joining client
    socket.emit('joined', {
      username : user.username,
      room     : user.room,
      color    : user.color,
      rooms    : ROOMS,
    });

    // Notify everyone else in the room
    socket.to(room).emit('notification', {
      type    : 'joined',
      message : `${username} joined the room`,
    });

    // Send updated user list to everyone in room
    io.to(room).emit('userList', getRoomUsers(room));
  });

  /* ── 2. Chat Message ─── */
  socket.on('message', (text) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Sanitise & reject empty messages
    const clean = String(text).trim().slice(0, 1000);
    if (!clean) return;

    const payload = {
      id       : `${socket.id}-${Date.now()}`,
      username : user.username,
      color    : user.color,
      text     : clean,
      time     : new Date().toISOString(),
    };

    // Broadcast to everyone in the room (including sender)
    io.to(user.room).emit('message', payload);
  });

  /* ── 3. Typing Indicator ─── */
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;

    // Broadcast to everyone ELSE in the room
    socket.to(user.room).emit('typing', {
      username : user.username,
      isTyping,
    });
  });

  /* ── 4. Switch Room ─── */
  socket.on('switchRoom', (newRoom) => {
    const user = users.get(socket.id);
    if (!user || !ROOMS.includes(newRoom) || newRoom === user.room) return;

    const oldRoom = user.room;

    // Leave old room
    socket.leave(oldRoom);
    socket.to(oldRoom).emit('notification', {
      type    : 'left',
      message : `${user.username} left the room`,
    });
    io.to(oldRoom).emit('userList', getRoomUsers(oldRoom));

    // Join new room
    user.room = newRoom;
    users.set(socket.id, user);
    socket.join(newRoom);

    socket.to(newRoom).emit('notification', {
      type    : 'joined',
      message : `${user.username} joined the room`,
    });
    io.to(newRoom).emit('userList', getRoomUsers(newRoom));

    // Tell client the switch succeeded
    socket.emit('roomSwitched', { room: newRoom });
  });

  /* ── 5. Disconnect ─── */
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`[-] ${user.username} disconnected from [${user.room}]`);

      socket.to(user.room).emit('notification', {
        type    : 'left',
        message : `${user.username} left the chat`,
      });

      users.delete(socket.id);
      io.to(user.room).emit('userList', getRoomUsers(user.room));
    }
  });
});

/* ─── Start Server ───────────────────────────── */
server.listen(PORT, () => {
  console.log(`\n  ✦ Pulse Chat running at http://localhost:${PORT}\n`);
});
