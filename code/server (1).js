/**
 * =====================================================
 *  Pulse Chat — server.js
 *  HOW TO RUN:
 *    1. npm install
 *    2. node server.js
 *    3. Open http://localhost:3000
 * =====================================================
 */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);
const PORT   = process.env.PORT || 3000;

/* Serve everything inside /public */
app.use(express.static(path.join(__dirname, 'public')));

/* ── In-Memory State ────────────────────────────── */
const users  = new Map(); // socket.id → { username, room, color }
const ROOMS  = ['General', 'Tech', 'Random'];
const COLORS = [
  '#60b4ff', '#56e39f', '#ffd166',
  '#ff6b9d', '#c77dff', '#4cc9f0',
  '#f4a261', '#a8dadc'
];
let colorIdx = 0;
const nextColor  = () => { const c = COLORS[colorIdx % COLORS.length]; colorIdx++; return c; };
const roomUsers  = room => {
  const list = [];
  users.forEach(u => { if (u.room === room) list.push({ username: u.username, color: u.color }); });
  return list;
};

/* ── Socket.io Events ───────────────────────────── */
io.on('connection', socket => {
  console.log(`[+] connected: ${socket.id}`);

  /* 1 — Join a room */
  socket.on('join', ({ username, room }) => {
    if (!username || !username.trim()) return;
    if (!ROOMS.includes(room)) room = 'General';
    username = username.trim().slice(0, 24);

    const user = { username, room, color: nextColor() };
    users.set(socket.id, user);
    socket.join(room);

    /* Tell the joining user their info + available rooms */
    socket.emit('joined', { username, room, color: user.color, rooms: ROOMS });

    /* Notify everyone else in the room */
    socket.to(room).emit('sys', { type: 'joined', text: `${username} joined the room ✨` });

    /* Send updated user list to everyone in the room */
    io.to(room).emit('users', roomUsers(room));

    console.log(`  → ${username} joined [${room}]`);
  });

  /* 2 — Chat message */
  socket.on('msg', text => {
    const user = users.get(socket.id);
    if (!user) return;
    const clean = String(text).trim().slice(0, 1000);
    if (!clean) return;
    io.to(user.room).emit('msg', {
      username : user.username,
      color    : user.color,
      text     : clean,
      time     : new Date().toISOString()
    });
  });

  /* 3 — Typing indicator */
  socket.on('typing', isTyping => {
    const user = users.get(socket.id);
    if (user) socket.to(user.room).emit('typing', { username: user.username, isTyping });
  });

  /* 4 — Switch room */
  socket.on('switchRoom', newRoom => {
    const user = users.get(socket.id);
    if (!user || !ROOMS.includes(newRoom) || newRoom === user.room) return;

    const old = user.room;
    socket.leave(old);
    socket.to(old).emit('sys', { type: 'left', text: `${user.username} left` });
    io.to(old).emit('users', roomUsers(old));

    user.room = newRoom;
    users.set(socket.id, user);
    socket.join(newRoom);
    socket.to(newRoom).emit('sys', { type: 'joined', text: `${user.username} joined ✨` });
    io.to(newRoom).emit('users', roomUsers(newRoom));
    socket.emit('switched', { room: newRoom });
  });

  /* 5 — Disconnect */
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.to(user.room).emit('sys', { type: 'left', text: `${user.username} left the chat` });
      users.delete(socket.id);
      io.to(user.room).emit('users', roomUsers(user.room));
      console.log(`[-] ${user.username} disconnected`);
    }
  });
});

/* ── Start ──────────────────────────────────────── */
server.listen(PORT, () => {
  console.log(`\n  ✦ Pulse Chat running at http://localhost:${PORT}\n`);
});
