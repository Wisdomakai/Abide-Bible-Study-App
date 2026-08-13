const FN_URL = 'https://udnczmdjjiltpehtvtas.functions.supabase.co/admin-data';
const $ = (id) => document.getElementById(id);
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[character]));
let activePassword = '';

const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase();
const fmt = (timestamp) => timestamp
  ? new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

function ago(timestamp) {
  if (!timestamp) return '—';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

async function load(password) {
  $('error').innerHTML = '';
  $('gateErr').innerHTML = '';
  try {
    const response = await fetch(FN_URL, {
      method: 'POST',
      headers: { 'x-admin-key': password, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (response.status === 401) throw new Error('Wrong password.');
    if (!response.ok) throw new Error(`Request failed (${response.status}).`);
    const data = await response.json();
    $('gate').classList.add('hidden');
    $('dash').classList.remove('hidden');
    const stats = data.stats;
    $('stats').innerHTML = [
      ['Total users', stats.users], ['Active 24h', stats.active24], ['Active 7d', stats.active7],
      ['Notifications', stats.pushOn], ['Groups', stats.groups], ['Posts', stats.posts],
      ['Logins today', stats.loginsToday],
    ].map(([label, number]) => `<div class="stat"><div class="n">${esc(number)}</div><div class="l">${esc(label)}</div></div>`).join('');
    $('users').innerHTML = data.users.length ? data.users.map((user) => `<tr>
      <td><span class="avatar">${esc(initials(user.name))}</span>${esc(user.name || '(no name)')}</td>
      <td><span class="chip">${esc(user.group)}</span></td><td>${esc(fmt(user.joined))}</td><td>${esc(ago(user.lastSeen))}</td>
      <td>${esc(user.posts)}</td><td>${esc(ago(user.lastPost))}</td>
      <td><span class="badge ${user.push ? 'on' : 'off'}">${user.push ? 'On' : 'Off'}</span></td></tr>`).join('') : '<tr><td colspan="7" class="muted">No users yet.</td></tr>';
    $('groups').innerHTML = data.groups.length ? data.groups.map((group) => `<tr><td>${esc(group.name)}</td><td><span class="chip">${esc(group.code)}</span></td><td>${esc(group.members)}</td><td>${esc(group.posts)}</td></tr>`).join('') : '<tr><td colspan="4" class="muted">No groups yet.</td></tr>';
    $('logins').innerHTML = data.logins.length ? data.logins.map((login) => `<tr><td>${esc(login.name || '—')}</td><td><span class="chip">${esc(login.group_code || '—')}</span></td><td>${esc(ago(login.created_at))}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">No logins recorded yet.</td></tr>';
    $('updated').textContent = `updated ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error('Admin data request failed:', error);
    const box = $('dash').classList.contains('hidden') ? 'gateErr' : 'error';
    $(box).innerHTML = `<div class="msg err">${esc(error.message || error)}</div>`;
  }
}

function enter() {
  const password = $('pw').value.trim();
  if (!password) return;
  activePassword = password;
  load(password);
}

$('enter').addEventListener('click', enter);
$('pw').addEventListener('keydown', (event) => { if (event.key === 'Enter') enter(); });
$('refresh').addEventListener('click', () => load(activePassword));
$('logout').addEventListener('click', () => location.reload());
