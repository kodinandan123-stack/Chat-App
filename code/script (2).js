/**
 * ╔══════════════════════════════════════════╗
 *  Pulse Chat — public/script.js
 *  Frontend Socket.io client logic
 * ╚══════════════════════════════════════════╝
 */

/* ─── DOM References ────────────────────── */
const joinScreen    = document.getElementById('joinScreen');
const chatApp       = document.getElementById('chatApp');
const usernameInput = document.getElementById('usernameInput');
const joinBtn       = document.getElementById('joinBtn');
const joinError     = document.getElementById('joinError');
const roomPills     = document.getElementById('roomPills');

const messages      = document.getElementById('messages');
const messagesWrap  = document.getElementById('messagesWrap');
const msgInput      = document.getElementById('msgInput');
const sendBtn       = document.getElementById('sendBtn');
const typingBar     = document.getElementById('typingBar');

const topbarRoom    = document.getElementById('topbarRoom');
const topbarStatus  = document.getElementById('topbarStatus');
const topbarAvatar  = document.getElementById('topbarAvatar');
const roomList      = document.getElementById('roomList');
const userList      = document.getElementById('userList');
const onlineCount   = document.getElementById('onlineCount');

const sidebar           = document.getElementById('sidebar');
const menuBtn           = document.getElementById('menuBtn');
const sidebarToggle     = document.getElementById('sidebarToggle');

/* ─── State ─────────────────────────────── */
let socket        = null;
let myUsername    = '';
let myColor       = '#7c6cfc';
let myRoom        = 'General';
let selectedRoom  = 'General';

// Typing debounce
let typingTimeout = null;
let isTypingNow   = false;

// Typing map: username → timeout id
const typingUsers = new Map();

/* ─── Sound Notification ─────────────────── */
// Create a tiny "ping" using the Web Audio API (no file needed)
function playPing() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) { /* AudioContext blocked — silently skip */ }
}

/* ─── Sidebar (mobile) ───────────────────── */
// Create overlay element
const overlay = document.createElement('div');
overlay.className = 'sidebar-overlay';
document.body.appendChild(overlay);

function openSidebar()  { sidebar.classList.add('open'); overlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

menuBtn.addEventListener('click', openSidebar);
sidebarToggle.addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

/* ─── Room Pill Selection (Join Screen) ───── */
roomPills.addEventListener('click', e => {
  const pill = e.target.closest('.room-pill');
  if (!pill) return;
  document.querySelectorAll('.room-pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  selectedRoom = pill.dataset.room;
});

/* ─── Join Button ────────────────────────── */
joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') joinChat();
});

function joinChat() {
  const name = usernameInput.value.trim();
  if (!name) {
    joinError.textContent = 'Please enter your name.';
    usernameInput.focus();
    return;
  }
  joinError.textContent = '';

  // Connect to Socket.io server
  socket = io();
  bindSocketEvents();

  socket.emit('join', { username: name, room: selectedRoom });
}

/* ─── Socket Events ──────────────────────── */
function bindSocketEvents() {

  /* Connection confirmed */
  socket.on('connect', () => {
    topbarStatus.textContent = 'Connected';
    topbarStatus.classList.add('online');
  });

  socket.on('disconnect', () => {
    topbarStatus.textContent = 'Disconnected — reconnecting…';
    topbarStatus.classList.remove('online');
  });

  /* Server confirmed the join */
  socket.on('joined', ({ username, room, color, rooms }) => {
    myUsername = username;
    myRoom     = room;
    myColor    = color;

    // Update UI
    topbarAvatar.textContent       = username[0].toUpperCase();
    topbarAvatar.style.background  = color;
    topbarRoom.textContent         = room;

    // Populate sidebar rooms
    renderRoomList(rooms, room);

    // Show chat screen
    joinScreen.classList.add('hide');
    setTimeout(() => {
      joinScreen.style.display = 'none';
      chatApp.classList.add('visible');
      msgInput.focus();
    }, 400);
  });

  /* Incoming message */
  socket.on('message', (msg) => {
    const isOwn = msg.username === myUsername;
    appendMessage(msg, isOwn);
    if (!isOwn) playPing();
  });

  /* Notification (joined/left) */
  socket.on('notification', ({ type, message }) => {
    appendNotification(message, type);
  });

  /* Typing indicator */
  socket.on('typing', ({ username, isTyping }) => {
    if (isTyping) {
      typingUsers.set(username, true);
    } else {
      typingUsers.delete(username);
    }
    renderTyping();
  });

  /* User list update */
  socket.on('userList', (users) => {
    renderUserList(users);
  });

  /* Room switched successfully */
  socket.on('roomSwitched', ({ room }) => {
    myRoom = room;
    topbarRoom.textContent = room;
    messages.innerHTML     = '';  // Clear messages when switching rooms
    typingUsers.clear();
    renderTyping();
    appendNotification(`You joined #${room}`, 'joined');
    updateActiveSidebarRoom(room);
  });
}

/* ─── Send Message ───────────────────────── */
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  if (!socket) return;
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit('message', text);
  msgInput.value = '';
  msgInput.style.height = 'auto'; // reset textarea height

  // Stop typing indicator
  emitTyping(false);
}

/* ─── Typing Indicator (emit) ────────────── */
msgInput.addEventListener('input', () => {
  // Auto-resize textarea
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';

  if (!socket) return;

  if (!isTypingNow) {
    isTypingNow = true;
    emitTyping(true);
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTypingNow = false;
    emitTyping(false);
  }, 1500);
});

function emitTyping(state) {
  if (socket) socket.emit('typing', state);
}

/* ─── Render: Typing indicator ───────────── */
function renderTyping() {
  if (typingUsers.size === 0) {
    typingBar.innerHTML = '';
    return;
  }
  const names = [...typingUsers.keys()];
  const label = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing`
    : 'Several people are typing';

  typingBar.innerHTML = `
    <span>${label}</span>
    <span class="typing-dots">
      <span></span><span></span><span></span>
    </span>
  `;
}

/* ─── Render: Message bubble ─────────────── */
function appendMessage(msg, isOwn) {
  const row = document.createElement('div');
  row.className = `msg-row ${isOwn ? 'own' : 'other'}`;

  const time = formatTime(new Date(msg.time));
  const initial = msg.username[0].toUpperCase();

  if (!isOwn) {
    // Avatar (only for others)
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.style.background = msg.color;
    avatar.textContent = initial;
    row.appendChild(avatar);
  }

  const body = document.createElement('div');
  body.className = 'msg-body';

  body.innerHTML = `
    <div class="msg-meta">
      ${!isOwn ? `<span class="msg-username" style="color:${msg.color}">${escapeHtml(msg.username)}</span>` : ''}
      <span class="msg-time">${time}</span>
    </div>
    <div class="msg-bubble">${escapeHtml(msg.text)}</div>
  `;

  row.appendChild(body);
  messages.appendChild(row);
  scrollToBottom();
}

/* ─── Render: Notification ───────────────── */
function appendNotification(text, type = '') {
  const el = document.createElement('div');
  el.className = `msg-notification ${type}`;
  el.textContent = text;
  messages.appendChild(el);
  scrollToBottom();
}

/* ─── Render: Room List (sidebar) ────────── */
function renderRoomList(rooms, activeRoom) {
  roomList.innerHTML = '';
  rooms.forEach(room => {
    const item = document.createElement('div');
    item.className = `room-item ${room === activeRoom ? 'active' : ''}`;
    item.textContent = room;
    item.addEventListener('click', () => {
      if (room === myRoom) { closeSidebar(); return; }
      socket.emit('switchRoom', room);
      closeSidebar();
    });
    roomList.appendChild(item);
  });
}

function updateActiveSidebarRoom(room) {
  document.querySelectorAll('.room-item').forEach(el => {
    el.classList.toggle('active', el.textContent === room);
  });
}

/* ─── Render: User List (sidebar) ─────────── */
function renderUserList(users) {
  onlineCount.textContent = users.length;
  userList.innerHTML = '';
  users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.innerHTML = `
      <div class="user-avatar" style="background:${u.color}">${u.username[0].toUpperCase()}</div>
      <span>${escapeHtml(u.username)}</span>
      <div class="user-dot"></div>
    `;
    userList.appendChild(item);
  });
}

/* ─── Helpers ────────────────────────────── */
function scrollToBottom() {
  messagesWrap.scrollTo({ top: messagesWrap.scrollHeight, behavior: 'smooth' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
