/* =====================================================
   Pulse Chat — script.js
   Socket.io client logic
   Served via Node.js → http://localhost:3000
   ===================================================== */

/* ── DOM refs ── */
const joinScreen = document.getElementById('joinScreen');
const chatApp    = document.getElementById('chatApp');
const nameInput  = document.getElementById('nameInput');
const joinBtn    = document.getElementById('joinBtn');
const joinLabel  = document.getElementById('joinLabel');
const joinErr    = document.getElementById('joinErr');
const roomBtns   = document.getElementById('roomBtns');

const msgs       = document.getElementById('msgs');
const mwrap      = document.getElementById('mwrap');
const msgInput   = document.getElementById('msgInput');
const sendBtn    = document.getElementById('sendBtn');
const typBar     = document.getElementById('typBar');

const tbRoom     = document.getElementById('tbRoom');
const tbStat     = document.getElementById('tbStat');
const myAv       = document.getElementById('myAv');
const roomList   = document.getElementById('roomList');
const userList   = document.getElementById('userList');
const onum       = document.getElementById('onum');

const sidebar    = document.getElementById('sidebar');
const sbMask     = document.getElementById('sbMask');
const menuBtn    = document.getElementById('menuBtn');
const sbClose    = document.getElementById('sbClose');

/* ── State ── */
let socket, myName = '', myColor = '', myRoom = 'General', selRoom = 'General';
let typing = false, typTimer = null;
const typMap = new Map();

/* ── Sidebar (mobile) ── */
const openSB  = () => { sidebar.classList.add('open'); sbMask.classList.add('on'); };
const closeSB = () => { sidebar.classList.remove('open'); sbMask.classList.remove('on'); };
menuBtn.addEventListener('click', openSB);
sbClose.addEventListener('click', closeSB);
sbMask.addEventListener('click', closeSB);

/* ── Room pill selection on join screen ── */
roomBtns.addEventListener('click', e => {
  const btn = e.target.closest('.rb');
  if (!btn) return;
  document.querySelectorAll('.rb').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  selRoom = btn.dataset.room;
});

/* ── Join ── */
joinBtn.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });

function doJoin() {
  const name = nameInput.value.trim();
  if (!name) { joinErr.textContent = 'Please enter your name.'; nameInput.focus(); return; }
  joinErr.textContent = '';
  joinBtn.disabled = true;
  joinLabel.textContent = 'Connecting…';

  socket = io(); // connects to the server that served this page
  bindSocket();
  socket.emit('join', { username: name, room: selRoom });
}

/* ── Socket event bindings ── */
function bindSocket() {

  socket.on('connect', () => {
    tbStat.textContent = 'Connected';
    tbStat.classList.add('on');
  });

  socket.on('disconnect', () => {
    tbStat.textContent = 'Reconnecting…';
    tbStat.classList.remove('on');
  });

  /* Server confirmed the join */
  socket.on('joined', ({ username, room, color, rooms }) => {
    myName  = username;
    myRoom  = room;
    myColor = color;

    myAv.textContent      = username[0].toUpperCase();
    myAv.style.background = color;
    tbRoom.textContent    = `# ${room}`;

    buildRooms(rooms, room);

    /* Transition join screen → chat */
    joinScreen.classList.add('out');
    setTimeout(() => {
      joinScreen.style.display = 'none';
      chatApp.classList.add('on');
      msgInput.focus();
    }, 420);
  });

  /* Incoming chat message */
  socket.on('msg', m => {
    addMsg(m, m.username === myName);
    if (m.username !== myName) ping();
  });

  /* System notification (joined / left) */
  socket.on('sys', ({ type, text }) => addSys(text, type));

  /* Typing indicator */
  socket.on('typing', ({ username, isTyping: t }) => {
    if (t) typMap.set(username, true); else typMap.delete(username);
    showTyp();
  });

  /* Updated online user list */
  socket.on('users', users => renderUsers(users));

  /* Room switch confirmed */
  socket.on('switched', ({ room }) => {
    myRoom = room;
    tbRoom.textContent = `# ${room}`;
    msgs.innerHTML = `<div class="wchip">👋 You joined #${room}!</div>`;
    typMap.clear();
    showTyp();
    markRoom(room);
  });
}

/* ── Send message ── */
sendBtn.addEventListener('click', send);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

function send() {
  if (!socket) return;
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit('msg', text);
  msgInput.value = '';
  msgInput.style.height = 'auto';
  stopTyp();
}

/* ── Typing indicator (emit to server) ── */
msgInput.addEventListener('input', () => {
  /* Auto-resize textarea */
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 108) + 'px';

  if (!socket) return;
  if (!typing) { typing = true; socket.emit('typing', true); }
  clearTimeout(typTimer);
  typTimer = setTimeout(stopTyp, 1600);
});

function stopTyp() {
  if (typing) { typing = false; if (socket) socket.emit('typing', false); }
}

/* ── Show typing indicator (received from server) ── */
function showTyp() {
  if (!typMap.size) { typBar.innerHTML = ''; return; }
  const names = [...typMap.keys()];
  const label = names.length === 1 ? `${names[0]} is typing`
              : names.length === 2 ? `${names[0]} and ${names[1]} are typing`
              : 'Several people are typing';
  typBar.innerHTML = `<span>${label}</span><span class="tdots"><span></span><span></span><span></span></span>`;
}

/* ── Render: chat message bubble ── */
function addMsg(m, own) {
  const row  = document.createElement('div');
  row.className = `mrow ${own ? 'own' : 'other'}`;
  const time = new Date(m.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const av   = own ? '' : `<div class="mav" style="background:${m.color}">${m.username[0].toUpperCase()}</div>`;
  row.innerHTML = `
    ${av}
    <div class="mbody">
      <div class="mmeta">
        ${!own ? `<span class="mname" style="color:${m.color}">${esc(m.username)}</span>` : ''}
        <span class="mtime">${time}</span>
      </div>
      <div class="bubble">${esc(m.text)}</div>
    </div>`;
  msgs.appendChild(row);
  scrollD();
}

/* ── Render: system notification ── */
function addSys(text, type = '') {
  const el = document.createElement('div');
  el.className = `sysn ${type}`;
  el.textContent = text;
  msgs.appendChild(el);
  scrollD();
}

/* ── Render: sidebar room list ── */
function buildRooms(rooms, active) {
  roomList.innerHTML = '';
  rooms.forEach(r => {
    const el = document.createElement('div');
    el.className = `sbroom ${r === active ? 'on' : ''}`;
    el.innerHTML = `<span style="color:var(--muted)">#</span> ${r}`;
    el.addEventListener('click', () => {
      if (r === myRoom) { closeSB(); return; }
      socket.emit('switchRoom', r);
      closeSB();
    });
    roomList.appendChild(el);
  });
}

function markRoom(room) {
  document.querySelectorAll('.sbroom').forEach(el => {
    el.classList.toggle('on', el.textContent.trim() === room);
  });
}

/* ── Render: sidebar user list ── */
function renderUsers(users) {
  onum.textContent = users.length;
  userList.innerHTML = '';
  users.forEach(u => {
    const el = document.createElement('div');
    el.className = 'sbuser';
    el.innerHTML = `
      <div class="uav" style="background:${u.color}">${u.username[0].toUpperCase()}</div>
      <span>${esc(u.username)}</span>
      <div class="udot"></div>`;
    userList.appendChild(el);
  });
}

/* ── Helpers ── */
function scrollD() { mwrap.scrollTo({ top: mwrap.scrollHeight, behavior: 'smooth' }); }

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* Sound ping using Web Audio API — no audio file needed */
function ping() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    o.start(); o.stop(ctx.currentTime + 0.28);
  } catch (_) {}
}
