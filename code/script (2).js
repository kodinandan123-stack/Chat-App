/* ===== Pulse Chat — script.js =====
   IMPORTANT: This ONLY works via Node.js.
   Run: npm install && node server.js
   Open: http://localhost:3000
   ================================== */

/* ── DOM ── */
const joinScreen = document.getElementById('joinScreen');
const chatApp    = document.getElementById('chatApp');
const nameInput  = document.getElementById('nameInput');
const joinBtn    = document.getElementById('joinBtn');
const joinErr    = document.getElementById('joinErr');
const roomBtns   = document.getElementById('roomBtns');

const msgs       = document.getElementById('msgs');
const msgsWrap   = document.getElementById('msgsWrap');
const msgInput   = document.getElementById('msgInput');
const sendBtn    = document.getElementById('sendBtn');
const typingBar  = document.getElementById('typingBar');

const tbRoom     = document.getElementById('tbRoom');
const tbStat     = document.getElementById('tbStat');
const myAv       = document.getElementById('myAv');
const roomList   = document.getElementById('roomList');
const userList   = document.getElementById('userList');
const onlineN    = document.getElementById('onlineN');

const sidebar    = document.getElementById('sidebar');
const sbMask     = document.getElementById('sbMask');
const menuBtn    = document.getElementById('menuBtn');
const sbClose    = document.getElementById('sbClose');

/* ── State ── */
let socket       = null;
let myName       = '';
let myColor      = '#6c63ff';
let myRoom       = 'General';
let selRoom      = 'General';   // selected on join screen
let isTyping     = false;
let typingTimer  = null;
const typingMap  = new Map();

/* ── Room pill selection on join screen ── */
roomBtns.addEventListener('click', e => {
  const btn = e.target.closest('.rb');
  if(!btn) return;
  document.querySelectorAll('.rb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selRoom = btn.dataset.room;
});

/* ── Sidebar ── */
function openSB()  { sidebar.classList.add('open'); sbMask.classList.add('on'); }
function closeSB() { sidebar.classList.remove('open'); sbMask.classList.remove('on'); }
menuBtn.addEventListener('click', openSB);
sbClose.addEventListener('click', closeSB);
sbMask.addEventListener('click', closeSB);

/* ── Join ── */
joinBtn.addEventListener('click', doJoin);
nameInput.addEventListener('keydown', e => { if(e.key === 'Enter') doJoin(); });

function doJoin() {
  const name = nameInput.value.trim();
  if(!name) { joinErr.textContent = 'Please enter your name.'; nameInput.focus(); return; }
  joinErr.textContent = '';
  joinBtn.disabled = true;
  joinBtn.querySelector('span') ? joinBtn.childNodes[0].textContent = 'Connecting…' : null;

  socket = io();
  bindSocket();
  socket.emit('join', { username: name, room: selRoom });
}

/* ── Socket ── */
function bindSocket() {
  socket.on('connect', () => {
    tbStat.textContent = 'Connected';
    tbStat.classList.add('online');
  });
  socket.on('disconnect', () => {
    tbStat.textContent = 'Reconnecting…';
    tbStat.classList.remove('online');
  });

  socket.on('joined', ({ username, room, color, rooms }) => {
    myName  = username;
    myRoom  = room;
    myColor = color;

    myAv.textContent      = username[0].toUpperCase();
    myAv.style.background = color;
    tbRoom.textContent    = `# ${room}`;

    buildRoomList(rooms, room);

    /* switch screens */
    joinScreen.classList.add('out');
    setTimeout(() => {
      joinScreen.style.display = 'none';
      chatApp.classList.add('on');
      msgInput.focus();
    }, 420);
  });

  socket.on('message', m => {
    addMsg(m, m.username === myName);
    if(m.username !== myName) ping();
  });

  socket.on('notification', ({ type, msg }) => {
    addNotif(msg, type);
  });

  socket.on('typing', ({ username, isTyping: t }) => {
    if(t) typingMap.set(username, true); else typingMap.delete(username);
    showTyping();
  });

  socket.on('userList', users => renderUsers(users));

  socket.on('roomSwitched', ({ room }) => {
    myRoom = room;
    tbRoom.textContent = `# ${room}`;
    msgs.innerHTML = `<div class="welcome-chip">👋 You joined #${room}!</div>`;
    typingMap.clear(); showTyping();
    markActiveRoom(room);
  });
}

/* ── Send ── */
sendBtn.addEventListener('click', send);
msgInput.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send(); }
});

function send() {
  if(!socket) return;
  const text = msgInput.value.trim();
  if(!text) return;
  socket.emit('message', text);
  msgInput.value = '';
  msgInput.style.height = 'auto';
  stopTyping();
}

/* ── Typing emit ── */
msgInput.addEventListener('input', () => {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 108) + 'px';
  if(!socket) return;
  if(!isTyping){ isTyping=true; socket.emit('typing',true); }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1600);
});
function stopTyping(){ if(isTyping){ isTyping=false; if(socket) socket.emit('typing',false); } }

/* ── Typing display ── */
function showTyping() {
  if(!typingMap.size){ typingBar.innerHTML=''; return; }
  const names = [...typingMap.keys()];
  const label = names.length===1 ? `${names[0]} is typing`
              : names.length===2 ? `${names[0]} and ${names[1]} are typing`
              : 'Several people are typing';
  typingBar.innerHTML = `<span>${label}</span><span class="t-dots"><span></span><span></span><span></span></span>`;
}

/* ── Render message ── */
function addMsg(m, own) {
  const row  = document.createElement('div');
  row.className = `msg-row ${own ? 'own' : 'other'}`;
  const init = m.username[0].toUpperCase();
  const time = new Date(m.time).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
  const av   = own ? '' : `<div class="m-av" style="background:${m.color}">${init}</div>`;
  row.innerHTML = `
    ${av}
    <div class="m-body">
      <div class="m-meta">
        ${!own ? `<span class="m-name" style="color:${m.color}">${esc(m.username)}</span>` : ''}
        <span class="m-time">${time}</span>
      </div>
      <div class="bubble">${esc(m.text)}</div>
    </div>`;
  msgs.appendChild(row);
  scrollDown();
}

/* ── Render notification ── */
function addNotif(text, type='') {
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = text;
  msgs.appendChild(el);
  scrollDown();
}

/* ── Room list ── */
function buildRoomList(rooms, active) {
  roomList.innerHTML = '';
  rooms.forEach(r => {
    const el = document.createElement('div');
    el.className = `sb-room ${r===active?'active':''}`;
    el.innerHTML = `<span style="color:var(--muted)">#</span> ${r}`;
    el.addEventListener('click', () => {
      if(r===myRoom){ closeSB(); return; }
      socket.emit('switchRoom', r);
      closeSB();
    });
    roomList.appendChild(el);
  });
}

function markActiveRoom(room) {
  document.querySelectorAll('.sb-room').forEach(el => {
    el.classList.toggle('active', el.textContent.trim() === room);
  });
}

/* ── User list ── */
function renderUsers(users) {
  onlineN.textContent = users.length;
  userList.innerHTML = '';
  users.forEach(u => {
    const el = document.createElement('div');
    el.className = 'sb-user';
    el.innerHTML = `<div class="u-av" style="background:${u.color}">${u.username[0].toUpperCase()}</div><span>${esc(u.username)}</span><div class="u-dot"></div>`;
    userList.appendChild(el);
  });
}

/* ── Helpers ── */
function scrollDown() { msgsWrap.scrollTo({ top: msgsWrap.scrollHeight, behavior:'smooth' }); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function ping() {
  try {
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440,ctx.currentTime+.12);
    g.gain.setValueAtTime(.09,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.28);
    o.start(); o.stop(ctx.currentTime+.28);
  } catch(_){}
}
