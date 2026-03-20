/**
 * Pulse Chat — server.js
 * Run: npm install  then  node server.js
 * Open: http://localhost:3000
 */
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve the public folder
app.use(express.static(path.join(__dirname, 'public')));

// ─── State ───────────────────────────────────
const users = new Map(); // socket.id → { username, room, color }
const ROOMS = ['General', 'Tech', 'Random'];

const COLORS = ['#60b4ff','#56e39f','#ffd166','#ff6b9d','#c77dff','#4cc9f0','#f4a261','#a8dadc'];
let colorIdx = 0;
const nextColor = () => { const c = COLORS[colorIdx % COLORS.length]; colorIdx++; return c; };

function roomUsers(room) {
  const list = [];
  users.forEach(u => { if(u.room === room) list.push({ username: u.username, color: u.color }); });
  return list;
}

// ─── Socket.io ───────────────────────────────
io.on('connection', socket => {
  console.log(`[+] ${socket.id} connected`);

  // 1. Join
  socket.on('join', ({ username, room }) => {
    if(!username || !username.trim()) return;
    if(!ROOMS.includes(room)) room = 'General';
    username = username.trim().slice(0, 24);

    const user = { username, room, color: nextColor() };
    users.set(socket.id, user);
    socket.join(room);

    socket.emit('joined', { username, room, color: user.color, rooms: ROOMS });
    socket.to(room).emit('notification', { type: 'joined', msg: `${username} joined the room ✨` });
    io.to(room).emit('userList', roomUsers(room));
    console.log(`  → ${username} joined [${room}]`);
  });

  // 2. Message
  socket.on('message', text => {
    const user = users.get(socket.id);
    if(!user) return;
    const clean = String(text).trim().slice(0, 1000);
    if(!clean) return;
    io.to(user.room).emit('message', {
      id: `${socket.id}-${Date.now()}`,
      username: user.username,
      color:    user.color,
      text:     clean,
      time:     new Date().toISOString()
    });
  });

  // 3. Typing
  socket.on('typing', isTyping => {
    const user = users.get(socket.id);
    if(user) socket.to(user.room).emit('typing', { username: user.username, isTyping });
  });

  // 4. Switch room
  socket.on('switchRoom', newRoom => {
    const user = users.get(socket.id);
    if(!user || !ROOMS.includes(newRoom) || newRoom === user.room) return;

    const old = user.room;
    socket.leave(old);
    socket.to(old).emit('notification', { type: 'left', msg: `${user.username} left the room` });
    io.to(old).emit('userList', roomUsers(old));

    user.room = newRoom;
    users.set(socket.id, user);
    socket.join(newRoom);
    socket.to(newRoom).emit('notification', { type: 'joined', msg: `${user.username} joined ✨` });
    io.to(newRoom).emit('userList', roomUsers(newRoom));
    socket.emit('roomSwitched', { room: newRoom });
  });

  // 5. Disconnect
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if(user) {
      socket.to(user.room).emit('notification', { type: 'left', msg: `${user.username} left the chat` });
      users.delete(socket.id);
      io.to(user.room).emit('userList', roomUsers(user.room));
      console.log(`[-] ${user.username} disconnected`);
    }
  });
});

server.listen(PORT, () => console.log(`\n  ✦ Pulse Chat → http://localhost:${PORT}\n`));
