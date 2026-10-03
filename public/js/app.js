/* ═══════════════════════════════════════════════════════════
   WINTER ARC 2026 — Main App JS
   ═══════════════════════════════════════════════════════════ */

const QUOTES = [
  "Kẻ thù mạnh nhất của mày không phải ngoài kia. Nó ngủ trên giường của mày mỗi sáng.",
  "Khi mày nghĩ mày đã đến giới hạn → mày mới đang ở 40% khả năng thật sự.",
  "Sự kỷ luật bây giờ = Tự do sau này.",
  "Đừng nghĩ 'tao đang cố tập thể dục'. Nghĩ: 'Tao LÀ người tập thể dục.'",
  "Thành công không đến từ những gì mày làm thỉnh thoảng. Nó đến từ những gì mày làm nhất quán.",
  "Cải thiện 1% mỗi ngày × 90 ngày = 2.45x — mày sẽ mạnh gấp đôi.",
  "Winter Arc không phải về việc trở nên hoàn hảo. Nó về việc không bỏ cuộc.",
  "Mày không cần cảm thấy muốn làm — mày chỉ cần LÀM.",
  "Mệt mới cần tập. Không có ngày nghỉ trong tâm trí.",
  "Nếu plan là hôm nay, làm hôm nay. Không có 'ngày mai'.",
];

// ─── State ────────────────────────────────────────────────────
let currentPage = 'dashboard';
let logDate = toDateStr(new Date());
let sidebarCollapsed = false;
let status = {};
let charts = {};

function toDateStr(d) { return d.toISOString().slice(0,10); }
function formatDate(str) {
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' });
}

// ─── Toast ────────────────────────────────────────────────────
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type==='error' ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ─── API ──────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: {'Content-Type':'application/json'} };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  return res.json();
}

// ─── Router ───────────────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  if (page === 'dashboard')   loadDashboard();
  if (page === 'daily')       loadDailyPage();
  if (page === 'rewards')     loadRewards();
  if (page === 'milestones')  loadMilestones();
  if (page === 'stats')       loadStats();
  if (page === 'plan')        loadPlan();
  if (page === 'settings')    loadSettings();
}

// ─── Sidebar ──────────────────────────────────────────────────
document.getElementById('sidebarToggle').addEventListener('click', () => {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('main').classList.toggle('collapsed', sidebarCollapsed);
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigate(link.dataset.page);
  });
});

// ─── XP & Level helpers ──────────────────────────────────────
const LEVELS = [
  { min:0,    max:99,   level:1, name:'Rookie' },
  { min:100,  max:299,  level:2, name:'Soldier' },
  { min:300,  max:599,  level:3, name:'Warrior' },
  { min:600,  max:999,  level:4, name:'Elite' },
  { min:1000, max:1499, level:5, name:'Legend' },
  { min:1500, max:Infinity, level:6, name:'Winter Arc Master ❄️' },
];
function getLevel(xp) { return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0]; }
function getXPProgress(xp) {
  const lv = getLevel(xp);
  if (lv.level === 6) return 100;
  const range = lv.max - lv.min + 1;
  return Math.round(((xp - lv.min) / range) * 100);
}

function updateSidebarXP(xp) {
  const lv = getLevel(xp);
  document.getElementById('xpLevelName').textContent = `LV${lv.level} — ${lv.name}`;
  document.getElementById('xpBar').style.width = getXPProgress(xp) + '%';
  document.getElementById('xpCurrent').textContent = xp;
}

// ─── Dashboard ────────────────────────────────────────────────
async function loadDashboard() {
  status = await api('GET', '/api/status');
  const { day, phase, totalXP, level, wakeupStreak, workoutStreak, noSocialStreak, loggedDays, heatmap } = status;

  // header date
  document.getElementById('dashDate').textContent = new Date().toLocaleDateString('vi-VN', {weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'});

  // cards
  document.getElementById('cardDay').textContent = day;
  document.getElementById('dayProgress').style.width = Math.round((day/90)*100) + '%';
  document.getElementById('cardPhase').textContent = phase.name;
  document.getElementById('cardPhaseNum').textContent = `Phase ${phase.num}`;
  document.getElementById('cardXP').textContent = totalXP.toLocaleString();
  document.getElementById('cardLevel').textContent = level.name;
  document.getElementById('cardLogged').textContent = loggedDays;

  // sidebar
  document.getElementById('sidebarDayNum').textContent = day;
  document.getElementById('sidebarPhase').textContent = phase.name;
  updateSidebarXP(totalXP);

  // streaks
  document.getElementById('streakWakeup').textContent = wakeupStreak;
  document.getElementById('streakWorkout').textContent = workoutStreak;
  document.getElementById('streakNoSocial').textContent = noSocialStreak;

  // heatmap
  buildHeatmap(heatmap, day);

  // quick check
  await loadQuickCheck();

  // quote
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  document.querySelector('#dailyQuote .quote-text').textContent = '"' + QUOTES[dayOfYear % QUOTES.length] + '"';
}

function buildHeatmap(heatmap, currentDay) {
  const el = document.getElementById('heatmap');
  el.innerHTML = '';
  const todayStr = toDateStr(new Date());

  for (const cell of heatmap) {
    const div = document.createElement('div');
    div.className = 'heatmap-cell';
    if (cell.date === todayStr) div.classList.add('today');
    if (cell.day > currentDay) div.classList.add('future');

    if (cell.logged) {
      div.dataset.score = cell.score ?? 0;
    }

    div.title = `Day ${cell.day} (${cell.date})${cell.logged ? ` — ${cell.score}/9 habits` : ' — not logged'}`;
    div.addEventListener('click', () => {
      if (cell.day <= currentDay) {
        logDate = cell.date;
        navigate('daily');
      }
    });
    el.appendChild(div);
  }
}

async function loadQuickCheck() {
  const todayStr = toDateStr(new Date());
  const log = await api('GET', `/api/log/${todayStr}`);
  const habits = [
    { key:'wakeup',    icon:'⏰', name:'Dậy 04:30' },
    { key:'workout',   icon:'💪', name:'Workout' },
    { key:'coldShower',icon:'🚿', name:'Tắm lạnh' },
    { key:'meditation',icon:'🧘', name:'Thiền' },
    { key:'reading',   icon:'📖', name:'Đọc sách' },
    { key:'water',     icon:'💧', name:'Nước 2L' },
    { key:'deepWork',  icon:'🧠', name:'Deep Work' },
    { key:'noSocial',  icon:'🚫', name:'No Social AM' },
    { key:'sleep',     icon:'🌙', name:'Ngủ 22:30' },
  ];
  const checklist = log?.checklist || {};
  const el = document.getElementById('quickCheck');
  el.innerHTML = habits.map(h => `
    <div class="quick-habit ${checklist[h.key] ? 'done' : ''}">
      <div class="quick-habit-check">${checklist[h.key] ? '✓' : ''}</div>
      <span>${h.icon} ${h.name}</span>
    </div>
  `).join('');
}

// ─── Daily Log ────────────────────────────────────────────────
function loadDailyPage() {
  updateDateLabel();
  loadDailyLog();
  setupDailyForm();
}

function updateDateLabel() {
  document.getElementById('logDateLabel').textContent = formatDate(logDate);
}

document.getElementById('prevDay').addEventListener('click', () => {
  const d = new Date(logDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  logDate = toDateStr(d);
  updateDateLabel();
  loadDailyLog();
});
document.getElementById('nextDay').addEventListener('click', () => {
  const d = new Date(logDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const today = new Date();
  if (d <= today) { logDate = toDateStr(d); updateDateLabel(); loadDailyLog(); }
});
document.getElementById('goToday').addEventListener('click', () => {
  logDate = toDateStr(new Date());
  updateDateLabel();
  loadDailyLog();
});

function setupDailyForm() {
  // Sliders
  document.querySelector('[name="morningMood"]').addEventListener('input', e => {
    document.getElementById('morningMoodVal').textContent = e.target.value;
  });
  document.querySelector('[name="selfScore"]').addEventListener('input', e => {
    document.getElementById('selfScoreVal').textContent = e.target.value;
  });

  // Habit toggles
  document.querySelectorAll('.habit-toggle').forEach(toggle => {
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const key = toggle.dataset.key;
      const item = toggle.closest('.habit-item');
      item.classList.toggle('done');
      updateChecklistScore();
      updateXPPreview();
    });
  });
  document.querySelectorAll('.habit-item').forEach(item => {
    item.addEventListener('click', e => {
      if (e.target.closest('.habit-extra') || e.target.closest('.habit-toggle')) return;
      const toggle = item.querySelector('.habit-toggle');
      item.classList.toggle('done');
      updateChecklistScore();
      updateXPPreview();
    });
  });

  // Workout table
  document.getElementById('addWorkout').addEventListener('click', addWorkoutRow);

  // Deep work table
  document.getElementById('addDeepWork').addEventListener('click', addDeepWorkRow);

  // Form submit
  document.getElementById('dailyForm').addEventListener('submit', e => {
    e.preventDefault();
    submitDailyLog();
  });
}

function updateChecklistScore() {
  const done = document.querySelectorAll('.habit-item.done').length;
  document.getElementById('checklistScore').textContent = `${done}/9`;
}

function getChecklist() {
  const checklist = {};
  document.querySelectorAll('.habit-item').forEach(item => {
    checklist[item.dataset.key] = item.classList.contains('done');
  });
  return checklist;
}

function updateXPPreview() {
  const checklist = getChecklist();
  const fakeLog = { checklist };
  // Calculate locally
  let xp = 0;
  const events = [];
  const c = checklist;

  if (c.wakeup)    { xp += 5;  events.push({ reason:'⏰ Dậy đúng 04:30', xp:+5, type:'pos' }); }
  else             { xp -= 5;  events.push({ reason:'😴 Ngủ quá 04:30', xp:-5, type:'neg' }); }
  if (c.workout)   { xp += 10; events.push({ reason:'💪 Workout sáng', xp:+10, type:'pos' }); }
  else             { xp -= 10; events.push({ reason:'❌ Bỏ workout', xp:-10, type:'neg' }); }
  if (c.coldShower){ xp += 5;  events.push({ reason:'🧊 Tắm lạnh', xp:+5, type:'pos' }); }
  if (c.meditation){ xp += 5;  events.push({ reason:'🧘 Thiền', xp:+5, type:'pos' }); }
  if (c.reading)   { xp += 5;  events.push({ reason:'📖 Đọc sách', xp:+5, type:'pos' }); }
  if (c.water)     { xp += 3;  events.push({ reason:'💧 Uống nước', xp:+3, type:'pos' }); }
  if (c.deepWork)  { xp += 10; events.push({ reason:'🧠 Deep Work', xp:+10, type:'pos' }); }
  if (c.noSocial)  { xp += 5;  events.push({ reason:'🚫 No Social AM', xp:+5, type:'pos' }); }
  else             { xp -= 5;  events.push({ reason:'📱 Social media sáng', xp:-5, type:'neg' }); }
  if (c.sleep)     { xp += 5;  events.push({ reason:'🌙 Ngủ trước 22:30', xp:+5, type:'pos' }); }
  else             { xp -= 5;  events.push({ reason:'🔴 Ngủ sau 22:30', xp:-5, type:'neg' }); }

  const count = Object.values(c).filter(Boolean).length;
  if (count === 9) { xp += 20; events.push({ reason:'🏆 PERFECT DAY!', xp:+20, type:'bon' }); }

  document.getElementById('xpPreviewTotal').textContent = (xp >= 0 ? '+' : '') + xp + ' XP';
  document.getElementById('xpPreviewEvents').innerHTML = events.map(ev =>
    `<span class="xp-event-tag ${ev.type}">${ev.reason} ${ev.xp >= 0 ? '+' : ''}${ev.xp}</span>`
  ).join('');
}

function addWorkoutRow() {
  const tbody = document.getElementById('workoutBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="Push-up Standard"/></td>
    <td><input type="text" placeholder="3 × 15"/></td>
    <td><input type="text" placeholder="Ghi chú..."/></td>
    <td><button type="button" class="btn-del" onclick="this.closest('tr').remove()">✕</button></td>
  `;
  tbody.appendChild(tr);
}

function addDeepWorkRow() {
  const tbody = document.getElementById('deepWorkBody');
  const idx = tbody.rows.length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${idx}</td>
    <td><input type="time" class="dw-from"/></td>
    <td><input type="time" class="dw-to" oninput="updateDeepWorkTotal()"/></td>
    <td><input type="text" placeholder="Task..."/></td>
    <td><input type="number" min="1" max="5" value="4" style="max-width:60px"/></td>
    <td><button type="button" class="btn-del" onclick="this.closest('tr').remove(); updateDeepWorkTotal()">✕</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.dw-from').addEventListener('change', updateDeepWorkTotal);
  tr.querySelector('.dw-to').addEventListener('change', updateDeepWorkTotal);
}

function updateDeepWorkTotal() {
  let totalMin = 0;
  document.querySelectorAll('#deepWorkBody tr').forEach(tr => {
    const from = tr.querySelector('.dw-from')?.value;
    const to   = tr.querySelector('.dw-to')?.value;
    if (from && to) {
      const [fh, fm] = from.split(':').map(Number);
      const [th, tm] = to.split(':').map(Number);
      const mins = (th * 60 + tm) - (fh * 60 + fm);
      if (mins > 0) totalMin += mins;
    }
  });
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  document.getElementById('deepWorkTotal').textContent = `Tổng: ${h}h ${m}m`;
}

async function loadDailyLog() {
  const log = await api('GET', `/api/log/${logDate}`);

  // Reset form
  const form = document.getElementById('dailyForm');
  form.reset();
  document.querySelectorAll('.habit-item').forEach(i => i.classList.remove('done'));
  document.getElementById('workoutBody').innerHTML = '';
  document.getElementById('deepWorkBody').innerHTML = '';
  updateChecklistScore();
  updateXPPreview();
  document.getElementById('morningMoodVal').textContent = '7';
  document.getElementById('selfScoreVal').textContent = '7';

  if (!log) return;

  // Fill checklist
  const c = log.checklist || {};
  Object.entries(c).forEach(([key, val]) => {
    if (val) {
      const item = document.querySelector(`.habit-item[data-key="${key}"]`);
      if (item) item.classList.add('done');
    }
  });
  updateChecklistScore();

  // Fill simple fields
  const fields = ['intention','mainGoal','book','readingInsight','good1','good2','good3','improve','dayQuote','wakeupTime','coldShowerTime','cardioMinutes','cardioKm'];
  fields.forEach(f => {
    const el = form.elements[f] || form.querySelector(`[name="${f}"]`);
    if (el && log[f] !== undefined) el.value = log[f];
  });

  if (log.morningMood) { form.elements['morningMood'].value = log.morningMood; document.getElementById('morningMoodVal').textContent = log.morningMood; }
  if (log.selfScore)   { form.elements['selfScore'].value = log.selfScore; document.getElementById('selfScoreVal').textContent = log.selfScore; }
  if (log.pageFrom)    { form.elements['pageFrom'].value = log.pageFrom; }
  if (log.pageTo)      { form.elements['pageTo'].value = log.pageTo; }

  // Physical
  if (log.physical) {
    ['pushup','plank','squat','pullup'].forEach(k => {
      const el = form.elements[k]; if (el && log.physical[k]) el.value = log.physical[k];
    });
  }

  // Workout rows
  (log.workout_exercises || []).forEach(ex => {
    addWorkoutRow();
    const rows = document.getElementById('workoutBody').rows;
    const last = rows[rows.length - 1];
    last.cells[0].querySelector('input').value = ex.name || '';
    last.cells[1].querySelector('input').value = ex.sets || '';
    last.cells[2].querySelector('input').value = ex.note || '';
  });

  // Deep work rows
  (log.deepWork?.sessions || []).forEach(s => {
    addDeepWorkRow();
    const rows = document.getElementById('deepWorkBody').rows;
    const last = rows[rows.length - 1];
    last.querySelector('.dw-from').value = s.from || '';
    last.querySelector('.dw-to').value = s.to || '';
    last.cells[3].querySelector('input').value = s.task || '';
    last.cells[4].querySelector('input').value = s.productivity || 4;
  });
  updateDeepWorkTotal();
  updateXPPreview();
}

async function submitDailyLog() {
  const form = document.getElementById('dailyForm');
  const data = {};

  // Checklist
  data.checklist = getChecklist();

  // Simple fields
  ['intention','mainGoal','morningMood','book','readingInsight','good1','good2','good3','improve','dayQuote','wakeupTime','coldShowerTime','cardioMinutes','cardioKm','pageFrom','pageTo','selfScore'].forEach(f => {
    const el = form.elements[f] || form.querySelector(`[name="${f}"]`);
    if (el) data[f] = el.value;
  });

  // Physical
  const physical = {};
  ['pushup','plank','squat','pullup'].forEach(k => {
    const v = form.elements[k]?.value;
    if (v) physical[k] = Number(v);
  });
  if (Object.keys(physical).length) data.physical = physical;

  // Workout exercises
  data.workout_exercises = [];
  document.querySelectorAll('#workoutBody tr').forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    if (inputs[0]?.value) {
      data.workout_exercises.push({ name: inputs[0].value, sets: inputs[1].value, note: inputs[2].value });
    }
  });

  // Deep work sessions
  const sessions = [];
  let totalHours = 0;
  document.querySelectorAll('#deepWorkBody tr').forEach(tr => {
    const from = tr.querySelector('.dw-from')?.value;
    const to   = tr.querySelector('.dw-to')?.value;
    const task = tr.cells[3]?.querySelector('input')?.value;
    const prod = tr.cells[4]?.querySelector('input')?.value;
    if (from && to) {
      const [fh,fm] = from.split(':').map(Number);
      const [th,tm] = to.split(':').map(Number);
      const h = ((th*60+tm)-(fh*60+fm)) / 60;
      if (h > 0) totalHours += h;
      sessions.push({ from, to, task, productivity: Number(prod), hours: h > 0 ? h : 0 });
    }
  });
  data.deepWork = { sessions, totalHours: +totalHours.toFixed(2) };

  const result = await api('POST', `/api/log/${logDate}`, data);
  if (result.success) {
    showToast(`✅ Đã lưu! +${result.xp} XP hôm nay (${result.habitCount}/9 habits)`);
    updateSidebarXP((status.totalXP || 0));
  } else {
    showToast('❌ Lỗi khi lưu', 'error');
  }
}

// ─── Rewards ──────────────────────────────────────────────────
async function loadRewards() {
  const rewards = await api('GET', '/api/rewards');
  const log = document.getElementById('eventLog');

  // set today's date default
  document.getElementById('rewardDate').value = toDateStr(new Date());

  if (!rewards.length) { log.innerHTML = '<div class="loading">Chưa có dữ liệu XP nào.</div>'; return; }

  // Sort by ts desc, show manual + bonus events
  const manualOnly = rewards.filter(r => !r.auto);
  const allEvents = [...rewards].reverse();

  log.innerHTML = allEvents.map((r) => `
    <div class="event-item ${r.xp >= 0 ? 'pos-ev' : 'neg-ev'}">
      <div>
        <div>${r.reason || '—'}</div>
        <div class="event-date">${r.date || ''} ${r.auto ? '' : '• thủ công'}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="event-xp ${r.xp >= 0 ? 'pos' : 'neg'}">${r.xp >= 0 ? '+' : ''}${r.xp} XP</span>
        ${!r.auto ? `<button class="btn-del" onclick="deleteReward('${r._id}')">✕</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function deleteReward(id) {
  if (!confirm('Xoá phần thưởng/kỷ luật này?')) return;
  await api('DELETE', `/api/rewards/${id}`);
  loadRewards();
}

document.getElementById('addRewardBtn').addEventListener('click', async () => {
  const reason = document.getElementById('rewardReason').value.trim();
  const xp     = parseInt(document.getElementById('rewardXP').value);
  const date   = document.getElementById('rewardDate').value;
  if (!reason || isNaN(xp)) { showToast('Điền đầy đủ lý do và XP', 'error'); return; }
  await api('POST', '/api/rewards', { reason, xp, date });
  document.getElementById('rewardReason').value = '';
  document.getElementById('rewardXP').value = '';
  showToast(`✅ Đã thêm: ${reason} (${xp >= 0 ? '+' : ''}${xp} XP)`);
  loadRewards();
});

// ─── Milestones ───────────────────────────────────────────────
async function loadMilestones() {
  const settings = await api('GET', '/api/settings');
  const startDate = new Date(settings.startDate + 'T00:00:00');
  const day = Math.floor((new Date() - startDate) / 86400000) + 1;
  const milestones = settings.milestones || [];

  const el = document.getElementById('milestoneTimeline');
  el.innerHTML = milestones.map(m => {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + m.day - 1);
    const dateStr = targetDate.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});

    let status = 'pending';
    if (m.reached) status = 'reached';
    else if (day === m.day) status = 'current';
    else if (day > m.day) status = 'past';

    const statusLabel = { pending:'Chưa đến', current:'🔥 Đang ở đây', reached:'✅ Đã đạt', past:'⚠️ Đã qua' };

    return `
      <div class="milestone-item ${status}">
        <div class="milestone-dot">${m.reached ? '✓' : (day === m.day ? '●' : '')}</div>
        <div class="milestone-header">
          <div class="milestone-day">DAY ${m.day} — ${dateStr}</div>
          <div class="milestone-status ${status}">${statusLabel[status] || status}</div>
        </div>
        <div class="milestone-title">${m.title}</div>
        <div class="milestone-desc">${m.desc}</div>
        ${status !== 'pending' && !m.reached ? `<button class="btn-add" style="margin-top:10px" onclick="markMilestone(${m.day})">✅ Đánh dấu đã đạt</button>` : ''}
      </div>
    `;
  }).join('');
}

async function markMilestone(day) {
  const settings = await api('GET', '/api/settings');
  const idx = settings.milestones.findIndex(m => m.day === day);
  if (idx !== -1) {
    settings.milestones[idx].reached = true;
    await api('PUT', '/api/settings', { milestones: settings.milestones });
    showToast('🏆 Milestone đã đạt! Xuất sắc!');
    loadMilestones();
  }
}
window.markMilestone = markMilestone;
window.deleteReward = deleteReward;

// ─── Stats ────────────────────────────────────────────────────
async function loadStats() {
  const data = await api('GET', '/api/stats');
  const weeks = data.weeks || [];

  const labels = weeks.map(w => `T${w.week}`);
  const xpData = weeks.map(w => w.totalXP);
  const scoreData = weeks.map(w => w.avgScore);
  const dwData = weeks.map(w => +w.deepWorkHours.toFixed(1));

  const habits = ['wakeup','workout','coldShower','meditation','reading','water','deepWork','noSocial','sleep'];
  const habitLabels = ['Dậy 04:30','Workout','Tắm lạnh','Thiền','Đọc sách','Uống nước','Deep Work','No Social','Ngủ sớm'];
  const habitRates = habits.map(h => {
    const total = weeks.reduce((s, w) => s + (w.habits[h] || 0), 0);
    const days  = weeks.reduce((s, w) => s + w.days, 0);
    return days ? Math.round((total / days) * 100) : 0;
  });

  const chartDefaults = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e1e35' } },
      y: { ticks: { color: '#64748b' }, grid: { color: '#1e1e35' } }
    }
  };

  function makeChart(id, type, labels, datasets, opts={}) {
    if (charts[id]) charts[id].destroy();
    const ctx = document.getElementById(id).getContext('2d');
    charts[id] = new Chart(ctx, { type, data: { labels, datasets }, options: { ...chartDefaults, ...opts } });
  }

  makeChart('chartXP', 'bar', labels, [{
    label: 'XP mỗi tuần',
    data: xpData,
    backgroundColor: 'rgba(124,58,237,0.6)',
    borderColor: '#7c3aed',
    borderWidth: 1,
    borderRadius: 6,
  }]);

  makeChart('chartScore', 'line', labels, [{
    label: 'Điểm hài lòng TB',
    data: scoreData,
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6,182,212,0.1)',
    fill: true,
    tension: 0.4,
    pointBackgroundColor: '#06b6d4',
    pointRadius: 4,
  }], { scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0, max: 10 } } });

  makeChart('chartHabits', 'bar', habitLabels, [{
    label: 'Tỷ lệ hoàn thành (%)',
    data: habitRates,
    backgroundColor: habitRates.map(r => r >= 80 ? 'rgba(16,185,129,0.7)' : r >= 60 ? 'rgba(234,179,8,0.7)' : 'rgba(239,68,68,0.7)'),
    borderRadius: 6,
  }], { indexAxis: 'y', scales: { x: { ...chartDefaults.scales.x, min: 0, max: 100 }, y: { ...chartDefaults.scales.y } } });

  makeChart('chartDeepWork', 'line', labels, [{
    label: 'Giờ Deep Work',
    data: dwData,
    borderColor: '#ec4899',
    backgroundColor: 'rgba(236,72,153,0.1)',
    fill: true,
    tension: 0.3,
    pointBackgroundColor: '#ec4899',
    pointRadius: 4,
  }]);

  // Physical progress
  const physical = data.physical || [];
  if (physical.length > 1) {
    const phLabels = physical.map(p => p.date);
    makeChart('chartPhysical', 'line', phLabels, [
      { label:'Push-up', data: physical.map(p => p.pushup||null), borderColor:'#7c3aed', tension:0.3, pointRadius:4 },
      { label:'Plank (s)', data: physical.map(p => p.plank||null), borderColor:'#06b6d4', tension:0.3, pointRadius:4 },
      { label:'Squat', data: physical.map(p => p.squat||null), borderColor:'#10b981', tension:0.3, pointRadius:4 },
      { label:'Pull-up', data: physical.map(p => p.pullup||null), borderColor:'#ec4899', tension:0.3, pointRadius:4 },
    ]);
  } else {
    document.getElementById('chartPhysical').parentElement.innerHTML += '<p style="color:var(--text-dim);text-align:center;font-size:0.8rem;margin-top:10px">Chưa đủ dữ liệu. Thêm benchmarks vào Daily Log!</p>';
  }
}

// ─── Settings ─────────────────────────────────────────────────
async function loadSettings() {
  const s = await api('GET', '/api/settings');
  document.getElementById('settingName').value = s.name || '';
  document.getElementById('settingStartDate').value = s.startDate || '';
  document.getElementById('settingNotifEnabled').checked = s.notifications?.enabled || false;
  document.getElementById('settingWakeup').value = s.notifications?.wakeup || '04:25';
  document.getElementById('settingMorningLog').value = s.notifications?.morningLog || '06:00';
  document.getElementById('settingEveningReview').value = s.notifications?.eveningReview || '21:00';
  document.getElementById('settingWindDown').value = s.notifications?.windDown || '21:30';
}

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const updated = {
    name: document.getElementById('settingName').value,
    startDate: document.getElementById('settingStartDate').value,
    notifications: {
      enabled: document.getElementById('settingNotifEnabled').checked,
      wakeup: document.getElementById('settingWakeup').value,
      morningLog: document.getElementById('settingMorningLog').value,
      eveningReview: document.getElementById('settingEveningReview').value,
      windDown: document.getElementById('settingWindDown').value,
    }
  };
  await api('PUT', '/api/settings', updated);
  showToast('✅ Đã lưu cài đặt!');
  if (updated.notifications.enabled) scheduleNotifications(updated.notifications);
});

// ─── Web Notifications ────────────────────────────────────────
document.getElementById('requestNotifBtn').addEventListener('click', async () => {
  if (!('Notification' in window)) { showToast('Browser không hỗ trợ notification', 'error'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') { showToast('🔔 Đã bật thông báo!'); }
  else { showToast('Thông báo bị từ chối', 'error'); }
});

let notifTimers = [];
function scheduleNotifications(notifSettings) {
  notifTimers.forEach(clearTimeout);
  notifTimers = [];
  if (!notifSettings.enabled || Notification.permission !== 'granted') return;

  const messages = [
    { time: notifSettings.wakeup,        title:'⏰ WINTER ARC', body:'5 phút nữa dậy rồi! Không alarm thứ 2.' },
    { time: notifSettings.morningLog,     title:'📝 WINTER ARC', body:'Điền morning intention ngay!' },
    { time: notifSettings.eveningReview,  title:'🌙 WINTER ARC', body:'Đến giờ review ngày của mày.' },
    { time: notifSettings.windDown,       title:'📵 WINTER ARC', body:'Wind down — tắt màn hình đi.' },
  ];

  messages.forEach(({ time, title, body }) => {
    if (!time) return;
    const [h, m] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    const t = setTimeout(() => {
      new Notification(title, { body, icon: '/favicon.ico' });
    }, delay);
    notifTimers.push(t);
  });
}

// ─── Plan Page ────────────────────────────────────────────────
function loadPlan() {
  // Tab switching
  document.querySelectorAll('.plan-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.plan-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    };
  });
}

// ─── Init ─────────────────────────────────────────────────────
async function init() {
  navigate('dashboard');

  // Auto-schedule notifications if enabled
  const s = await api('GET', '/api/settings');
  if (s.notifications?.enabled && Notification.permission === 'granted') {
    scheduleNotifications(s.notifications);
  }
}

init();
