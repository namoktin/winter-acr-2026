require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const { DailyLog, Reward, Settings } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection ───────────────────────────────────────
const DEFAULT_SETTINGS = {
  userId: 'default',
  name: 'Nam',
  startDate: '2026-10-03',
  totalDays: 90,
  notifications: { enabled: true, wakeup: '04:25', morningLog: '06:00', eveningReview: '21:00', windDown: '21:30' },
  milestones: [
    { day: 7,  title: 'Hoàn thành tuần đầu không bỏ',   desc: 'Log 7/7 ngày',                              reached: false },
    { day: 14, title: 'Thói quen sáng sớm ổn định',     desc: 'Dậy đúng 04:30 ≥ 12/14 ngày',              reached: false },
    { day: 30, title: 'End Phase 1 Review',              desc: 'Đánh giá thể lực + progress kỹ năng',      reached: false },
    { day: 45, title: 'Midpoint Check',                  desc: 'So sánh với Day 1',                        reached: false },
    { day: 60, title: 'End Phase 2 Review',              desc: 'Test thể lực: push-up, plank, 1km time',  reached: false },
    { day: 75, title: 'Final Stretch',                   desc: 'Không giảm — tăng thêm',                  reached: false },
    { day: 90, title: 'WINTER ARC COMPLETE ❄️',         desc: 'Tổng kết toàn bộ',                        reached: false },
  ],
};

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas connected');
    // Auto-init settings if not exists
    const existing = await Settings.findOne({ userId: 'default' });
    if (!existing) {
      await Settings.create(DEFAULT_SETTINGS);
      console.log('✅ Default settings initialized');
    }
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

// ─── XP Calculator ───────────────────────────────────────────
function calculateXP(log) {
  let xp = 0;
  const events = [];
  const c = log.checklist || {};

  if (c.wakeup)    { xp += 5;  events.push({ reason: '⏰ Dậy đúng 04:30', xp: +5 }); }
  else             { xp -= 5;  events.push({ reason: '😴 Ngủ quá 04:30',  xp: -5 }); }
  if (c.workout)   { xp += 10; events.push({ reason: '💪 Workout sáng hoàn thành', xp: +10 }); }
  else             { xp -= 10; events.push({ reason: '❌ Bỏ workout', xp: -10 }); }
  if (c.coldShower){ xp += 5;  events.push({ reason: '🧊 Tắm lạnh', xp: +5 }); }
  if (c.meditation){ xp += 5;  events.push({ reason: '🧘 Thiền/Breathing', xp: +5 }); }
  if (c.reading)   { xp += 5;  events.push({ reason: '📖 Đọc sách ≥20 trang', xp: +5 }); }
  if (c.water)     { xp += 3;  events.push({ reason: '💧 Uống đủ nước', xp: +3 }); }
  if (c.deepWork)  { xp += 10; events.push({ reason: '🧠 Deep Work ≥4h', xp: +10 }); }
  if (c.noSocial)  { xp += 5;  events.push({ reason: '🚫 Không social media sáng', xp: +5 }); }
  else             { xp -= 5;  events.push({ reason: '📱 Social media sáng', xp: -5 }); }
  if (c.sleep)     { xp += 5;  events.push({ reason: '🌙 Ngủ trước 22:30', xp: +5 }); }
  else             { xp -= 5;  events.push({ reason: '🔴 Ngủ sau 22:30', xp: -5 }); }

  const habitCount = Object.values(c).filter(Boolean).length;
  if (habitCount === 9) { xp += 20; events.push({ reason: '🏆 PERFECT DAY — 9/9 habits!', xp: +20 }); }

  return { xp, events, habitCount };
}

async function getStreak(key) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const log = await DailyLog.findOne({ date: dateStr });
    if (log && log.checklist && log.checklist[key]) streak++;
    else if (i > 0) break;
  }
  return streak;
}

function getDayNumber(startDate) {
  const start = new Date(startDate);
  const now = new Date();
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(diff, 90));
}

function getPhase(day) {
  if (day <= 28) return { num: 1, name: '🔥 IGNITION',      color: '#f97316' };
  if (day <= 56) return { num: 2, name: '⚡ ACCELERATION',  color: '#eab308' };
  return           { num: 3, name: '💎 FORGING',            color: '#8b5cf6' };
}

function getLevel(xp) {
  const levels = [
    { min: 0,    max: 99,         level: 1, name: 'Rookie' },
    { min: 100,  max: 299,        level: 2, name: 'Soldier' },
    { min: 300,  max: 599,        level: 3, name: 'Warrior' },
    { min: 600,  max: 999,        level: 4, name: 'Elite' },
    { min: 1000, max: 1499,       level: 5, name: 'Legend' },
    { min: 1500, max: Infinity,   level: 6, name: 'Winter Arc Master ❄️' },
  ];
  return levels.find(l => xp >= l.min && xp <= l.max) || levels[0];
}

// ─── API Routes ──────────────────────────────────────────────

// GET /api/status
app.get('/api/status', async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: 'default' });
    const day   = getDayNumber(settings.startDate);
    const phase = getPhase(day);

    // Total XP from logs + manual rewards
    const logs    = await DailyLog.find({});
    const rewards = await Reward.find({});
    const logXP   = logs.reduce((s, l) => s + (l.xp || 0), 0);
    const rewXP   = rewards.filter(r => !r.auto).reduce((s, r) => s + (r.xp || 0), 0);
    const totalXP = logXP + rewXP;
    const level   = getLevel(totalXP);

    const [wakeupStreak, workoutStreak, noSocialStreak] = await Promise.all([
      getStreak('wakeup'), getStreak('workout'), getStreak('noSocial'),
    ]);

    // Heatmap
    const startDate = new Date(settings.startDate);
    const heatmap = [];
    for (let i = 0; i < 90; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const log = logs.find(l => l.date === dateStr);
      heatmap.push({
        date: dateStr, day: i + 1,
        score: log ? (log.habitCount || 0) : null,
        logged: !!log,
      });
    }

    res.json({
      day, phase, totalXP, level,
      wakeupStreak, workoutStreak, noSocialStreak,
      loggedDays: logs.length,
      heatmap,
      settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/log/:date
app.get('/api/log/:date', async (req, res) => {
  try {
    const log = await DailyLog.findOne({ date: req.params.date });
    res.json(log || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/log/:date
app.post('/api/log/:date', async (req, res) => {
  try {
    const { xp, events, habitCount } = calculateXP(req.body);
    const data = { ...req.body, xp, events, habitCount, savedAt: new Date() };

    const log = await DailyLog.findOneAndUpdate(
      { date: req.params.date },
      data,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Sync auto-XP events to Reward collection
    await Reward.deleteMany({ date: req.params.date, auto: true });
    if (events.length) {
      await Reward.insertMany(events.map(ev => ({
        date: req.params.date, reason: ev.reason, xp: ev.xp, auto: true, ts: new Date(),
      })));
    }

    res.json({ success: true, xp, events, habitCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await DailyLog.find({}).sort({ date: 1 });
    // Return as object keyed by date (same format as old JSON)
    const obj = {};
    logs.forEach(l => { obj[l.date] = l.toObject(); });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/rewards
app.get('/api/rewards', async (req, res) => {
  try {
    const rewards = await Reward.find({}).sort({ ts: -1 });
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rewards (manual)
app.post('/api/rewards', async (req, res) => {
  try {
    const reward = await Reward.create({ ...req.body, auto: false, ts: new Date() });
    res.json({ success: true, reward });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/rewards/:id
app.delete('/api/rewards/:id', async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);
    if (!reward) return res.status(404).json({ error: 'Not found' });
    if (reward.auto) return res.status(400).json({ error: 'Cannot delete auto entry' });
    await Reward.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: 'default' });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
app.put('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { userId: 'default' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const settings = await Settings.findOne({ userId: 'default' });
    const startDate = new Date(settings.startDate);
    const logs = await DailyLog.find({}).sort({ date: 1 });
    const logsMap = {};
    logs.forEach(l => { logsMap[l.date] = l; });

    const weeks = [];
    for (let w = 0; w < 13; w++) {
      const wd = { week: w + 1, days: 0, totalXP: 0, habits: { wakeup:0, workout:0, coldShower:0, meditation:0, reading:0, water:0, deepWork:0, noSocial:0, sleep:0 }, deepWorkHours: 0, scores: [] };
      for (let d = 0; d < 7; d++) {
        const dt = new Date(startDate);
        dt.setDate(dt.getDate() + w * 7 + d);
        const key = dt.toISOString().slice(0, 10);
        const log = logsMap[key];
        if (log) {
          wd.days++;
          wd.totalXP += (log.xp || 0);
          wd.scores.push(log.selfScore || 0);
          const c = log.checklist || {};
          for (const h of Object.keys(wd.habits)) { if (c[h]) wd.habits[h]++; }
          (log.deepWork?.sessions || []).forEach(s => { wd.deepWorkHours += (s.hours || 0); });
        }
      }
      wd.avgScore = wd.scores.length ? +(wd.scores.reduce((a,b)=>a+b,0)/wd.scores.length).toFixed(1) : 0;
      weeks.push(wd);
    }

    const physical = logs
      .filter(l => l.physical && Object.keys(l.physical.toObject?.() || l.physical).some(k => l.physical[k]))
      .map(l => ({ date: l.date, ...l.physical.toObject?.() }));

    res.json({ weeks, physical });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Serve SPA ────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n❄️  WINTER ARC 2026 — Running at http://localhost:${PORT}`);
  });
});
