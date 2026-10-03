const mongoose = require('mongoose');

// ─── Daily Log Schema ─────────────────────────────────────────
const dailyLogSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true, index: true }, // "2026-10-03"
  checklist: {
    wakeup:     Boolean,
    workout:    Boolean,
    coldShower: Boolean,
    meditation: Boolean,
    reading:    Boolean,
    water:      Boolean,
    deepWork:   Boolean,
    noSocial:   Boolean,
    sleep:      Boolean,
  },
  intention:        String,
  mainGoal:         String,
  morningMood:      Number,
  wakeupTime:       String,
  coldShowerTime:   Number,
  book:             String,
  pageFrom:         Number,
  pageTo:           Number,
  readingInsight:   String,
  good1:            String,
  good2:            String,
  good3:            String,
  improve:          String,
  dayQuote:         String,
  selfScore:        Number,
  cardioMinutes:    Number,
  cardioKm:         Number,
  workout_exercises: [{ name: String, sets: String, note: String }],
  deepWork: {
    sessions: [{ from: String, to: String, task: String, productivity: Number, hours: Number }],
    totalHours: Number,
  },
  physical: {
    pushup: Number,
    plank:  Number,
    squat:  Number,
    pullup: Number,
  },
  xp:          Number,
  habitCount:  Number,
  events:      [{ reason: String, xp: Number }],
  savedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

// ─── Reward/Penalty Schema ────────────────────────────────────
const rewardSchema = new mongoose.Schema({
  date:   String,
  reason: String,
  xp:     Number,
  auto:   { type: Boolean, default: false },
  ts:     { type: Date, default: Date.now },
}, { timestamps: true });

// ─── Settings Schema ──────────────────────────────────────────
const settingsSchema = new mongoose.Schema({
  userId:    { type: String, default: 'default' },
  name:      { type: String, default: 'Nam' },
  startDate: { type: String, default: '2026-10-03' },
  totalDays: { type: Number, default: 90 },
  notifications: {
    enabled:       { type: Boolean, default: true },
    wakeup:        { type: String,  default: '04:25' },
    morningLog:    { type: String,  default: '06:00' },
    eveningReview: { type: String,  default: '21:00' },
    windDown:      { type: String,  default: '21:30' },
  },
  milestones: [{
    day:     Number,
    title:   String,
    desc:    String,
    reached: { type: Boolean, default: false },
  }],
}, { timestamps: true });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
const Reward   = mongoose.model('Reward',   rewardSchema);
const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { DailyLog, Reward, Settings };
