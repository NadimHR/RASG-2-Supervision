/**
 * RASG-2 তদারকি ও মূল্যায়ন ব্যবস্থা (পাইলট প্রকল্প)
 * এই স্ক্রিপ্ট রোস্টারের Google Sheet-এর সাথে যুক্ত। বিদ্যমান ট্যাবগুলো (Master_Staff_Roster,
 * Floor_Monthly_Schedule ইত্যাদি) শুধু পড়া হয় — কখনো বদলানো হয় না। নতুন সব তথ্য SV_ দিয়ে শুরু হওয়া ট্যাবে থাকে।
 */
var TZ = 'Asia/Dhaka';
var TAB = {
  CONFIG: 'SV_Config', REVIEWERS: 'SV_Reviewers', CRITERIA: 'SV_Criteria', PLAN: 'SV_Supervisor_Plan',
  WREV: 'SV_Worker_Reviews', RREV: 'SV_Room_Reviews', MASTER: 'SV_Feedback_Master', ISSUES: 'SV_Issues'
};
var HEAD = {};
HEAD[TAB.CONFIG] = ['Key', 'Value', 'ব্যাখ্যা'];
HEAD[TAB.REVIEWERS] = ['নাম', 'ভূমিকা (SUPERVISOR / OFFICER / ADMIN)', 'PIN', 'সক্রিয় (YES/NO)'];
HEAD[TAB.CRITERIA] = ['দল (FLOOR / EXT / SQUAD / REL / ROOM / ROOM_STAR)', 'Key', 'মূল্যায়নের বিষয়'];
HEAD[TAB.PLAN] = ['তারিখ', 'বার', 'শুরু', 'শেষ', 'হল', 'কাজ'];
HEAD[TAB.WREV] = ['সময়', 'ID', 'মূল্যায়নকারী', 'ভূমিকা', 'কর্মীর SL', 'কর্মীর নাম', 'আইডি', 'দায়িত্ব', 'তারিখ হতে', 'তারিখ পর্যন্ত', 'গড় স্কোর', 'মূল্যায়ন', 'বিস্তারিত স্কোর', 'মন্তব্য'];
HEAD[TAB.RREV] = ['সময়', 'ID', 'মূল্যায়নকারী', 'ভূমিকা', 'তলা', 'কক্ষ', 'পরিষ্কারের তারিখ', 'ধরন', 'কর্মী', 'অবস্থা', 'গড় স্কোর', 'মূল্যায়ন', 'বিস্তারিত স্কোর', 'মন্তব্য'];
HEAD[TAB.MASTER] = ['সময়', 'ID', 'ধরন (WORKER/ROOM/STUDENT)', 'মূল্যায়নকারী', 'ভূমিকা', 'তলা', 'কক্ষ', 'কর্মী', 'তারিখ হতে', 'তারিখ পর্যন্ত', 'গড় স্কোর', 'মূল্যায়ন (POSITIVE/AVERAGE/NEGATIVE)', 'কারণ', 'মন্তব্য', 'বিস্তারিত'];
HEAD[TAB.ISSUES] = ['ID', 'নথিভুক্তির সময়', 'নথিভুক্তকারী', 'হল', 'স্থান', 'ধরন', 'গুরুত্ব', 'বিবরণ', 'অবস্থা', 'দায়িত্বপ্রাপ্ত', 'সমাধান / গৃহীত ব্যবস্থা', 'হালনাগাদ', 'সমাধানের সময়'];

var DEFAULT_CONFIG = [
  ['RASG2_BLOCK_MINUTES', '180,210,210,240', 'RASG-2-এ টানা সময় (মিনিট) — প্রতিদিন এখান থেকে একটি এলোমেলোভাবে বাছাই হয়'],
  ['RASG1_MINUTES', '120', 'RASG-1 হলে সময় (মিনিট)'],
  ['MOVE_MINUTES', '20', 'এক হল থেকে অন্য হলে যেতে সময় (মিনিট)'],
  ['LUNCH_MINUTES', '60', 'নামাজ ও দুপুরের খাবারের বিরতি (মিনিট)'],
  ['LUNCH_FROM', '12:00', 'বিরতি এর আগে শুরু হবে না'],
  ['LUNCH_TO', '14:00', 'বিরতি এর মধ্যে শেষ হবে'],
  ['DAY_START', '08:00', 'সুপারভাইজারের দিন শুরু'],
  ['DAY_END', '16:00', 'সুপারভাইজারের দিন শেষ'],
  ['OTHER_HALLS', 'NK,MPB', 'যে হলগুলো পালা করে দেখা হবে (কমা দিয়ে)'],
  ['SUPERVISOR_OFF_DAY', 'Friday', 'সুপারভাইজারের সাপ্তাহিক ছুটি'],
  ['REVIEW_WINDOW_HOURS', '24', 'কক্ষ পরিষ্কারের পর কত ঘণ্টা মূল্যায়ন খোলা থাকবে'],
  ['STUDENT_REVIEW_OPEN', 'NO', 'YES করলে ছাত্রীরা লিংক/QR দিয়ে কক্ষের মূল্যায়ন দিতে পারবে (পাইলট শেষে)']
];
var DEFAULT_REVIEWERS = [
  ['সুপারভাইজার', 'SUPERVISOR', '0000', 'YES'],
  ['হল অফিসার', 'OFFICER', '0000', 'YES'],
  ['অ্যাডমিন (HR)', 'ADMIN', '0000', 'YES']
];
var DEFAULT_CRITERIA = [
  ['FLOOR', 'corridor', 'করিডোর ঝাড়ু-মোছা ও ময়লার ঝুড়ি'],
  ['FLOOR', 'washroom', '২টি ওয়াশরুম জোনের পরিচ্ছন্নতা'],
  ['FLOOR', 'rooms', 'নির্ধারিত কক্ষ ঝাড়ু ও মোছা'],
  ['FLOOR', 'star', '★ কক্ষের ফ্যান ও জানালা'],
  ['FLOOR', 'time', 'সময়ানুবর্তিতা ও উপস্থিতি'],
  ['FLOOR', 'conduct', 'আচরণ ও সরঞ্জামের যত্ন'],
  ['EXT', 'ground', 'প্রাঙ্গণ, বাগান ও চলাচলের পথ'],
  ['EXT', 'drain', 'ড্রেন ও সীমানাপ্রাচীর সংলগ্ন অংশ'],
  ['EXT', 'dustbin', 'কমন ডাস্টবিন এলাকা'],
  ['EXT', 'gate', 'ফটক, গ্রিল ও নামফলক'],
  ['EXT', 'time', 'সময়ানুবর্তিতা ও উপস্থিতি'],
  ['EXT', 'conduct', 'আচরণ ও সরঞ্জামের যত্ন'],
  ['SQUAD', 'stairs', 'সিঁড়ি ও রেলিং'],
  ['SQUAD', 'exhaust', 'ওয়াশরুমের জানালা ও এক্সজস্ট ফ্যান'],
  ['SQUAD', 'corrwin', 'করিডোরের জানালা ও অগ্নিনির্বাপক বক্স'],
  ['SQUAD', 'filter', 'পানির ফিল্টারের বাইরের অংশ'],
  ['SQUAD', 'roof', 'ছাদ (সাপ্তাহিক)'],
  ['SQUAD', 'time', 'সময়ানুবর্তিতা ও উপস্থিতি'],
  ['SQUAD', 'conduct', 'আচরণ ও সরঞ্জামের যত্ন'],
  ['REL', 'cover', 'বদলি তলার সম্পূর্ণ দায়িত্ব পালন'],
  ['REL', 'washroom', 'ওয়াশরুম জোনের পরিচ্ছন্নতা'],
  ['REL', 'rooms', 'নির্ধারিত কক্ষ পরিষ্কার'],
  ['REL', 'time', 'সময়ানুবর্তিতা ও উপস্থিতি'],
  ['REL', 'conduct', 'আচরণ ও সরঞ্জামের যত্ন'],
  ['ROOM', 'sweep', 'মেঝে ঝাড়ু'],
  ['ROOM', 'mop', 'মেঝে মোছা'],
  ['ROOM', 'veranda', 'বারান্দা'],
  ['ROOM', 'overall', 'সার্বিক পরিচ্ছন্নতা'],
  ['ROOM_STAR', 'fan', 'ফ্যান পরিষ্কার'],
  ['ROOM_STAR', 'window', 'জানালা পরিষ্কার']
];
var ISSUE_CATEGORIES = ['পরিচ্ছন্নতা', 'সরঞ্জাম ও সামগ্রী', 'কর্মীর উপস্থিতি', 'রোস্টার ও সময়সূচি', 'ছাত্রীদের অভিযোগ', 'রক্ষণাবেক্ষণ', 'অ্যাপ / সিস্টেম', 'অন্যান্য'];
var ISSUE_PRIORITIES = ['জরুরি', 'মাঝারি', 'সাধারণ'];
var ISSUE_STATUSES = ['খোলা', 'চলমান', 'সমাধান হয়েছে'];
var FLOOR_BN = { G: 'গ্রাউন্ড ফ্লোর', '1': '১ম তলা', '2': '২য় তলা', '3': '৩য় তলা', '4': '৪র্থ তলা', '5': '৫ম তলা', '6': '৬ষ্ঠ তলা', '7': '৭ম তলা', '8': '৮ম তলা', '9': '৯ম তলা', '10': '১০ম তলা', '11': '১১তম তলা', '12': '১২তম তলা', '13': '১৩তম তলা', '14': '১৪তম তলা', '15': '১৫তম তলা', EXT_FRONT: 'বাইরের সামনের অংশ', EXT_BACK: 'বাইরের পেছনের অংশ' };
var FLOOR_KEYS = ['G', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];
var DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var DAY_BN = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
var INSPECTION_GROUPS = [
  { key: 'ক', points: ['G', '1', '2', '3', '4', '5'] },
  { key: 'খ', points: ['6', '7', '8', '9', '10', 'EXT_FRONT'] },
  { key: 'গ', points: ['11', '12', '13', '14', '15', 'EXT_BACK'] }
];
var PLAN_EPOCH = '2026-11-14';

/* ---------- ওয়েব অ্যাপ ও মেনু ---------- */
function doGet(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  t.room = (e && e.parameter && e.parameter.room) ? String(e.parameter.room) : '';
  return t.evaluate().setTitle('RASG-2 তদারকি ও মূল্যায়ন')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // GitHub Pages-এ এমবেড করার জন্য
}
/* ---------- শিট সহায়ক ---------- */
var SHEET_ID = '1vMtQifS7nDNXHq708Uq1FCOIwlaiNtn-nNDKKbOmcgw';
var SS_CACHE = null;
function ss_() { return SS_CACHE || (SS_CACHE = SpreadsheetApp.openById(SHEET_ID)); }
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function rows_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) return [];
  var v = sh.getDataRange().getDisplayValues();
  return v.slice(1).filter(function (r) { return r.join('').trim() !== ''; });
}
function append_(name, row) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // তারিখ ও সময় যেন শিটে লেখা হিসেবেই থাকে (লোকেল অনুযায়ী বদলে না যায়)
    sheet_(name).appendRow(row.map(function (c) {
      if (c === null || c === undefined) return '';
      return (typeof c === 'string' && /^\d{4}-\d{2}-\d{2}/.test(c)) ? "'" + c : c;
    }));
  }
  finally { lock.releaseLock(); }
}
function setupSystem() {
  Object.keys(HEAD).forEach(function (n) { sheet_(n); });
  seed_(TAB.CONFIG, DEFAULT_CONFIG);
  var have = rows_(TAB.CONFIG).map(function (r) { return String(r[0]).trim(); });
  DEFAULT_CONFIG.forEach(function (r) { if (have.indexOf(r[0]) < 0) sheet_(TAB.CONFIG).appendRow(r); });
  seed_(TAB.REVIEWERS, DEFAULT_REVIEWERS);
  seed_(TAB.CRITERIA, DEFAULT_CRITERIA);
  writeSupervisorPlan();
  return 'OK';
}
function seed_(name, data) {
  if (rows_(name).length) return;
  sheet_(name).getRange(2, 1, data.length, data[0].length).setValues(data);
}
function config_() {
  var c = {};
  DEFAULT_CONFIG.forEach(function (r) { c[r[0]] = r[1]; });
  rows_(TAB.CONFIG).forEach(function (r) { if (r[0] && String(r[1]).trim() !== '') c[String(r[0]).trim()] = String(r[1]).trim(); });
  return c;
}

/* ---------- তারিখ ও সংখ্যা ---------- */
function bn_(v) { return String(v).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[Number(d)]; }); }
function nowStamp_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function todayIso_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function isoToDate_(iso) { var p = String(iso).split('-'); return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]))); }
function addDays_(iso, n) { var d = isoToDate_(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function dayIdx_(iso) { return isoToDate_(iso).getUTCDay(); }
function daysBetween_(a, b) { return Math.round((isoToDate_(b).getTime() - isoToDate_(a).getTime()) / 86400000); }
function normIso_(v) {
  var t = String(v || '').trim().replace(/[০-৯]/g, function (d) { return '০১২৩৪৫৬৭৮৯'.indexOf(d); });
  var m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);
  if (m) { var d = Number(m[1]), mo = Number(m[2]); if (mo > 12) { var x = d; d = mo; mo = x; } return m[3] + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2); }
  return '';
}
function hm_(min) { return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2); }
function hmBn_(min) { var h = Math.floor(min / 60), m = min % 60, h12 = h > 12 ? h - 12 : h; return bn_(('0' + h12).slice(-2) + ':' + ('0' + m).slice(-2)); }
function parseHm_(s) { var p = String(s).split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); }
function rng_(seedText) {
  var h = 2166136261;
  for (var i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

/* ---------- রোস্টার থেকে পড়া (শুধু পড়া) ---------- */
function staff_() {
  return rows_('Master_Staff_Roster').filter(function (r) { return r[1] || r[2]; }).map(function (r) {
    var post = String(r[4]).trim();
    var group = /^EXT/.test(post) ? 'EXT' : /^SQUAD/.test(post) ? 'SQUAD' : /^REL/.test(post) ? 'REL' : 'FLOOR';
    return { sl: String(r[0]).trim(), name: r[1], nameBn: r[2] || r[1], id: r[3], post: post, roleBn: r[5], offEn: r[6], group: group };
  });
}
function criteria_() {
  var rows = rows_(TAB.CRITERIA); if (!rows.length) rows = DEFAULT_CRITERIA;
  var out = {};
  rows.forEach(function (r) { var g = String(r[0]).trim(); if (!g) return; (out[g] = out[g] || []).push({ key: String(r[1]).trim(), label: r[2] }); });
  return out;
}
function schedule_() {
  return rows_('Floor_Monthly_Schedule').map(function (r) {
    return {
      floor: String(r[0]).trim(), date: normIso_(r[2]),
      rooms: String(r[5] || '').split(/[,،]/).map(function (x) { return x.trim(); }).filter(function (x) { return x && x.indexOf('ছুটি') < 0; }),
      star: String(r[6] || '').replace(/★/g, '').trim(), worker: r[7]
    };
  }).filter(function (r) { return r.floor && r.date; });
}

/* ---------- লগইন ---------- */
function reviewers_() {
  var rows = rows_(TAB.REVIEWERS); if (!rows.length) rows = DEFAULT_REVIEWERS;
  return rows.filter(function (r) { return String(r[3]).trim().toUpperCase() !== 'NO' && r[0]; })
    .map(function (r) { return { name: String(r[0]).trim(), role: String(r[1]).trim().toUpperCase() || 'SUPERVISOR', pin: String(r[2]).trim() }; });
}
function auth_(a) {
  if (!a) throw new Error('লগইন প্রয়োজন');
  var u = reviewers_().filter(function (r) { return r.name === a.name && r.pin === String(a.pin).trim(); })[0];
  if (!u) throw new Error('নাম বা PIN সঠিক নয়');
  return u;
}
function apiReviewerNames() { return reviewers_().map(function (r) { return r.name; }); }
function apiLogin(name, pin) {
  var u = auth_({ name: name, pin: pin });
  return {
    user: { name: u.name, role: u.role }, today: todayIso_(), staff: staff_(), criteria: criteria_(),
    floors: FLOOR_KEYS.map(function (k) { return { key: k, label: FLOOR_BN[k] }; }),
    issue: { categories: ISSUE_CATEGORIES, priorities: ISSUE_PRIORITIES, statuses: ISSUE_STATUSES },
    halls: ['RASG-2', 'RASG-1'].concat(config_().OTHER_HALLS.split(',').map(function (x) { return x.trim(); }))
  };
}

/* ---------- সুপারভাইজারের দৈনিক রুটিন ---------- */
function workdayIndex_(iso, offEn) {
  var n = 0, d = PLAN_EPOCH, total = daysBetween_(PLAN_EPOCH, iso);
  if (total < 0) return 0;
  for (var i = 0; i < total; i++) { if (DAY_EN[dayIdx_(d)] !== offEn) n++; d = addDays_(d, 1); }
  return n;
}
function buildDayPlan_(iso, cfg) {
  cfg = cfg || config_();
  var di = dayIdx_(iso), dayBn = DAY_BN[di];
  if (DAY_EN[di] === cfg.SUPERVISOR_OFF_DAY) return { date: iso, dayBn: dayBn, off: true, slots: [], r2: null };
  var rnd = rng_('sv|' + iso);
  var widx = workdayIndex_(iso, cfg.SUPERVISOR_OFF_DAY);
  var start = parseHm_(cfg.DAY_START), end = parseHm_(cfg.DAY_END), total = end - start;
  var move = Number(cfg.MOVE_MINUTES), lunch = Number(cfg.LUNCH_MINUTES), r1 = Number(cfg.RASG1_MINUTES);
  var opts = cfg.RASG2_BLOCK_MINUTES.split(',').map(Number).filter(function (x) { return x > 0; });
  var B = opts[Math.floor(rnd() * opts.length)];
  var others = cfg.OTHER_HALLS.split(',').map(function (x) { return x.trim(); }).filter(String);
  var otherHall = others.length ? others[widx % others.length] : '';
  var O = total - B - lunch - r1 - 2 * move, spare = 0;
  if (!otherHall || O < 30) { spare = total - B - lunch - r1 - move; O = 0; otherHall = ''; }
  var blocks = [{ hall: 'RASG-2', min: B }, { hall: 'RASG-1', min: r1 + spare }];
  if (O) blocks.push({ hall: otherHall, min: O });
  // বিরতি সবসময় ১২:০০–০২:০০-এর মধ্যে (শুরু ১২:০০ থেকে ০২:০০ − বিরতির সময়)। RASG-2 কখনো ভাঙা হয় না;
  // হল বদলের সময় বিরতি না পড়লে RASG-1/অন্য হলের পরিদর্শন দুই ভাগ করে মাঝে বিরতি দেওয়া হয়।
  var L0 = parseHm_(cfg.LUNCH_FROM || '12:00'), L1 = parseHm_(cfg.LUNCH_TO || '14:00') - lunch;
  var perms = permute_(blocks), valid = [];
  perms.forEach(function (p) {
    var t = start;
    for (var i = 0; i < p.length; i++) {
      var bs = t, be = t + p[i].min;
      if (i < p.length - 1 && be >= L0 && be <= L1) valid.push({ p: p, at: i, split: 0 });
      if (i > 0 && bs >= L0 && bs <= L1) valid.push({ p: p, at: i, split: 0, before: true });
      if (p[i].hall !== 'RASG-2') {
        var a = Math.max(L0, bs + 30), b = Math.min(L1, be - 30);
        if (a <= b) { var c = Math.min(Math.max(12 * 60 + 30, a), b); c = c - (c % 10); if (c < a) c += 10; if (c <= b) valid.push({ p: p, at: i, split: c - bs }); }
      }
      t = be + move;
    }
  });
  var cleanCut = valid.filter(function (v) { return !v.split; });
  var pool = cleanCut.length && rnd() < 0.7 ? cleanCut : valid;
  var pick = pool.length ? pool[Math.floor(rnd() * pool.length)] : { p: perms[0], at: 0, split: 0 };
  var slots = [], t = start, r2Start = 0;
  var brk = function (hall) { slots.push({ start: t, end: t + lunch, hall: hall, type: 'break', label: 'নামাজ ও দুপুরের খাবারের বিরতি' }); t += lunch; };
  pick.p.forEach(function (b, i) {
    var lab = b.hall === 'RASG-2' ? 'RASG-2: টানা তদারকি ও মূল্যায়ন' : b.hall + ' হল পরিদর্শন';
    if (i === pick.at && pick.before) brk(b.hall);
    if (b.hall === 'RASG-2') r2Start = t;
    if (i === pick.at && pick.split) {
      slots.push({ start: t, end: t + pick.split, hall: b.hall, type: 'work', label: lab }); t += pick.split;
      brk(b.hall);
      slots.push({ start: t, end: t + b.min - pick.split, hall: b.hall, type: 'work', label: lab + ' (চলমান)' }); t += b.min - pick.split;
    } else {
      slots.push({ start: t, end: t + b.min, hall: b.hall, type: 'work', label: lab }); t += b.min;
      if (i === pick.at && !pick.before) brk(b.hall);
    }
    if (i < pick.p.length - 1) { slots.push({ start: t, end: t + move, hall: '', type: 'move', label: pick.p[i].hall + ' → ' + pick.p[i + 1].hall + ' (যাতায়াত)' }); t += move; }
  });
  // RASG-2-এর ভেতরের কাজ
  var g = INSPECTION_GROUPS[widx % 3], order = g.points.slice();
  for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var x = order[i]; order[i] = order[j]; order[j] = x; }
  var rest = []; INSPECTION_GROUPS.forEach(function (q) { if (q.key !== g.key) rest = rest.concat(q.points); });
  var surprise = rest[Math.floor(rnd() * rest.length)];
  var points = order.concat([surprise]), inner = [], tt = r2Start, per = Math.floor((B - 40) / points.length);
  inner.push({ start: tt, end: tt + 20, label: 'উপস্থিতি ও বদলি কর্মী যাচাই; গতকালের খোলা সমস্যাগুলো দেখা' }); tt += 20;
  points.forEach(function (k, n) {
    inner.push({ start: tt, end: tt + per, point: k, label: FLOOR_BN[k] + (n === points.length - 1 ? ' (আকস্মিক পরিদর্শন)' : '') }); tt += per;
  });
  inner.push({ start: tt, end: r2Start + B, label: 'অ্যাপে মূল্যায়ন ও সমস্যা নথিভুক্তি সম্পন্ন করা; হল প্রশাসনকে জানানো' });
  return { date: iso, dayBn: dayBn, off: false, slots: slots, r2: { group: g.key, minutes: B, inner: inner }, otherHall: otherHall };
}
function permute_(a) {
  if (a.length <= 1) return [a];
  var out = [];
  a.forEach(function (x, i) { permute_(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); });
  return out;
}
function decoratePlan_(p) {
  p.dateBn = bn_(p.date.slice(8)) + '-' + bn_(p.date.slice(5, 7)) + '-' + bn_(p.date.slice(0, 4));
  p.slots.forEach(function (s) { s.time = hmBn_(s.start) + ' – ' + hmBn_(s.end); s.mins = s.end - s.start; });
  if (p.r2) p.r2.inner.forEach(function (s) { s.time = hmBn_(s.start) + ' – ' + hmBn_(s.end); });
  return p;
}
function apiPlan(a, iso) {
  auth_(a);
  iso = normIso_(iso) || todayIso_();
  var cfg = config_(), week = [];
  for (var i = 0; i < 7; i++) {
    var p = buildDayPlan_(addDays_(iso, i), cfg);
    var r2 = p.slots.filter(function (s) { return s.hall === 'RASG-2' && s.type === 'work'; })[0];
    week.push({ date: p.date, dayBn: p.dayBn, off: p.off, r2: r2 ? hmBn_(r2.start) + '–' + hmBn_(r2.end) : '', halls: p.slots.filter(function (s) { return s.type === 'work'; }).map(function (s) { return s.hall; }).join(' → ') });
  }
  return { plan: decoratePlan_(buildDayPlan_(iso, cfg)), week: week };
}
/** পুরো মেয়াদের রুটিন SV_Supervisor_Plan ট্যাবে লেখা (প্রিন্ট বা দেখার জন্য) */
function writeSupervisorPlan() {
  var cfg = config_(), startIso = todayIso_(), endIso = addDays_(startIso, 29);
  rows_('Official_Notices').forEach(function (r) {
    if (r[0] === 'rosterStartDate' && normIso_(r[2])) startIso = normIso_(r[2]);
    if (r[0] === 'rosterEndDate' && normIso_(r[2])) endIso = normIso_(r[2]);
  });
  var out = [], n = Math.min(62, daysBetween_(startIso, endIso) + 1);
  for (var i = 0; i < n; i++) {
    var p = buildDayPlan_(addDays_(startIso, i), cfg);
    if (p.off) { out.push([p.date, p.dayBn, '', '', '', 'সাপ্তাহিক ছুটি']); continue; }
    p.slots.forEach(function (s) {
      out.push([p.date, p.dayBn, hm_(s.start), hm_(s.end), s.hall, s.label + (s.hall === 'RASG-2' && s.type === 'work' ? ' — দল-' + p.r2.group + ': ' + p.r2.inner.filter(function (x) { return x.point; }).map(function (x) { return FLOOR_BN[x.point]; }).join(', ') : '')]);
    });
  }
  var sh = sheet_(TAB.PLAN);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, HEAD[TAB.PLAN].length).clearContent();
  if (out.length) sh.getRange(2, 1, out.length, 6).setNumberFormat('@').setValues(out);
  return out.length;
}

/* ---------- মূল্যায়নের শ্রেণিবিভাগ ---------- */
var NEG_WORDS = ['অপরিষ্কার', 'নোংরা', 'ময়লা', 'দুর্গন্ধ', 'খারাপ', 'হয়নি', 'হয় নি', 'করেনি', 'করেননি', 'করে নি', 'অভিযোগ', 'অসন্তুষ্ট', 'ধুলা', 'অনুপস্থিত', 'দেরি', 'dirty', 'bad', 'poor', 'not clean', 'unclean', 'smell', 'complain', 'late', 'absent'];
var POS_WORDS = ['ভালো', 'ভাল', 'সন্তুষ্ট', 'চমৎকার', 'সুন্দর', 'ঝকঝকে', 'পরিপাটি', 'ধন্যবাদ', 'good', 'excellent', 'nice', 'great', 'satisf', 'well'];
function classify_(avg, comment, forcedNegative) {
  var c = String(comment || '').toLowerCase();
  var neg = NEG_WORDS.filter(function (w) { return c.indexOf(w) >= 0; });
  var pos = POS_WORDS.filter(function (w) { return c.indexOf(w) >= 0; });
  if (forcedNegative) return { s: 'NEGATIVE', why: forcedNegative };
  var s = avg >= 4 ? 'POSITIVE' : avg >= 3 ? 'AVERAGE' : 'NEGATIVE', why = 'গড় স্কোর ' + avg;
  if (!avg) { s = neg.length ? 'NEGATIVE' : pos.length ? 'POSITIVE' : 'AVERAGE'; why = 'শুধু মন্তব্য'; }
  if (neg.length && s === 'POSITIVE') { s = 'AVERAGE'; why += '; মন্তব্যে নেতিবাচক শব্দ: ' + neg.join(', '); }
  else if (neg.length && s === 'AVERAGE' && !pos.length) { s = 'NEGATIVE'; why += '; মন্তব্যে নেতিবাচক শব্দ: ' + neg.join(', '); }
  else if (pos.length && !neg.length && s === 'AVERAGE' && avg >= 3.5) { s = 'POSITIVE'; why += '; মন্তব্য ইতিবাচক'; }
  return { s: s, why: why };
}
function scoreSummary_(scores, crit) {
  var vals = [], parts = [];
  crit.forEach(function (c) {
    var v = Number(scores && scores[c.key]);
    if (v >= 1 && v <= 5) { vals.push(v); parts.push(c.label + ': ' + v); }
  });
  var avg = vals.length ? Math.round(vals.reduce(function (x, y) { return x + y; }, 0) / vals.length * 100) / 100 : 0;
  return { avg: avg, text: parts.join(' | '), n: vals.length };
}
function id_(prefix) { return prefix + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100); }

/* ---------- কর্মী মূল্যায়ন ---------- */
function apiSubmitWorker(a, p) {
  var u = auth_(a);
  var w = staff_().filter(function (s) { return s.sl === String(p.sl); })[0];
  if (!w) throw new Error('কর্মী পাওয়া যায়নি');
  var from = normIso_(p.from) || todayIso_(), to = normIso_(p.to) || from;
  if (to < from) { var x = from; from = to; to = x; }
  if (to > todayIso_()) throw new Error('ভবিষ্যতের তারিখের মূল্যায়ন দেওয়া যাবে না');
  var sum = scoreSummary_(p.scores, criteria_()[w.group] || []);
  if (!sum.n) throw new Error('অন্তত একটি বিষয়ে স্কোর দিন');
  var cl = classify_(sum.avg, p.comment), id = id_('W'), ts = nowStamp_();
  append_(TAB.WREV, [ts, id, u.name, u.role, w.sl, w.nameBn, w.id, w.roleBn, from, to, sum.avg, cl.s, sum.text, p.comment || '']);
  append_(TAB.MASTER, [ts, id, 'WORKER', u.name, u.role, FLOOR_BN[w.post] || w.post, '', w.nameBn, from, to, sum.avg, cl.s, cl.why, p.comment || '', sum.text]);
  return { id: id, avg: sum.avg, sentiment: cl.s };
}
function apiWorkerHistory(a, sl) {
  auth_(a);
  return rows_(TAB.WREV).filter(function (r) { return String(r[4]) === String(sl); }).slice(-5).reverse()
    .map(function (r) { return { ts: r[0], by: r[2], from: r[8], to: r[9], avg: r[10], s: r[11], comment: r[13] }; });
}

/* ---------- কক্ষ মূল্যায়ন (পরিষ্কারের পর নির্দিষ্ট ঘণ্টা খোলা) ---------- */
function openRooms_(floorKey) {
  var cfg = config_(), win = Number(cfg.REVIEW_WINDOW_HOURS) * 3600000, now = new Date().getTime();
  var today = todayIso_(), from = addDays_(today, -Math.ceil(Number(cfg.REVIEW_WINDOW_HOURS) / 24) - 1), out = [];
  schedule_().forEach(function (r) {
    if (floorKey && r.floor !== floorKey) return;
    if (r.date < from || r.date > today) return;
    var add = function (room, type, endHm) {
      var endAt = new Date(r.date + 'T' + endHm + ':00+06:00').getTime();
      if (now >= endAt && now < endAt + win)
        out.push({ floor: r.floor, room: room, date: r.date, type: type, worker: r.worker, cleanedAt: r.date + ' ' + endHm, closesIn: Math.round((endAt + win - now) / 60000) });
    };
    r.rooms.forEach(function (room) { add(room, 'REGULAR', '13:00'); });
    if (r.star) add(r.star, 'STAR', '16:00');
  });
  return out;
}
function apiRoomsOpen(a, floorKey) {
  var u = auth_(a);
  var done = {};
  rows_(TAB.RREV).forEach(function (r) { if (r[2] === u.name) done[r[4] + '|' + r[5] + '|' + r[6] + '|' + r[7]] = r[10] || r[9]; });
  return openRooms_(floorKey).map(function (o) {
    o.done = done[FLOOR_BN[o.floor] + '|' + o.room + '|' + o.date + '|' + o.type] || '';
    o.closesBn = bn_(Math.floor(o.closesIn / 60)) + ' ঘ ' + bn_(o.closesIn % 60) + ' মি';
    return o;
  });
}
function saveRoom_(u, p, kind) {
  var open = openRooms_(p.floor).filter(function (o) { return o.room === p.room && o.date === p.date && o.type === p.type; })[0];
  if (!open) throw new Error('এই কক্ষের মূল্যায়নের সময় শেষ হয়ে গেছে (পরিষ্কারের পর ' + bn_(config_().REVIEW_WINDOW_HOURS) + ' ঘণ্টা খোলা থাকে)');
  var cr = criteria_(), crit = (cr.ROOM || []).concat(p.type === 'STAR' ? (cr.ROOM_STAR || []) : []);
  var status = p.status || 'পরিষ্কার হয়েছে', cleaned = status === 'পরিষ্কার হয়েছে';
  var sum = cleaned ? scoreSummary_(p.scores, crit) : { avg: 0, text: '', n: 0 };
  if (cleaned && !sum.n) throw new Error('অন্তত একটি বিষয়ে স্কোর দিন');
  var forced = status === 'কর্মী পরিষ্কার করেননি' ? 'কর্মী কক্ষ পরিষ্কার করেননি' : '';
  var cl = cleaned || forced ? classify_(sum.avg, p.comment, forced) : { s: 'AVERAGE', why: 'ছাত্রী অনুপস্থিত থাকায় পরিষ্কার হয়নি (কর্মীর দায় নয়)' };
  var id = id_(kind === 'STUDENT' ? 'S' : 'R'), ts = nowStamp_(), fl = FLOOR_BN[p.floor] || p.floor, typeBn = p.type === 'STAR' ? '★ ফ্যান ও জানালাসহ' : 'সাধারণ';
  append_(TAB.RREV, [ts, id, u.name, u.role, fl, p.room, p.date, p.type, open.worker, status, sum.avg || '', cl.s, sum.text, p.comment || '']);
  append_(TAB.MASTER, [ts, id, kind, u.name, u.role, fl, p.room, open.worker, p.date, p.date, sum.avg || '', cl.s, cl.why, p.comment || '', typeBn + ' | ' + status + (sum.text ? ' | ' + sum.text : '')]);
  return { id: id, avg: sum.avg, sentiment: cl.s };
}
function apiSubmitRoom(a, p) { return saveRoom_(auth_(a), p, 'ROOM'); }
/* ছাত্রীদের জন্য (SV_Config-এ STUDENT_REVIEW_OPEN = YES করলে চালু) */
function apiStudentRoom(room) {
  if (config_().STUDENT_REVIEW_OPEN.toUpperCase() !== 'YES') return { open: false };
  var cr = criteria_();
  return { open: true, rooms: openRooms_('').filter(function (o) { return o.room === String(room).trim(); }), criteria: cr };
}
function apiStudentSubmit(p) {
  if (config_().STUDENT_REVIEW_OPEN.toUpperCase() !== 'YES') throw new Error('ছাত্রীদের মূল্যায়ন এখনও চালু হয়নি');
  return saveRoom_({ name: 'কক্ষ ' + p.room + '-এর ছাত্রী', role: 'STUDENT' }, p, 'STUDENT');
}

/* ---------- সমস্যা নিবন্ধন (Issue Register) ---------- */
function apiIssues(a) {
  auth_(a);
  return rows_(TAB.ISSUES).map(function (r) {
    return { id: r[0], at: r[1], by: r[2], hall: r[3], place: r[4], cat: r[5], pri: r[6], desc: r[7], status: r[8], owner: r[9], fix: r[10], upd: r[11], closed: r[12] };
  }).reverse();
}
function apiIssueSave(a, p) {
  var u = auth_(a), ts = nowStamp_();
  if (!p.id) {
    if (!String(p.desc || '').trim()) throw new Error('সমস্যার বিবরণ লিখুন');
    var n = rows_(TAB.ISSUES).length + 1, id = 'ISS-' + ('000' + n).slice(-4);
    append_(TAB.ISSUES, [id, ts, u.name, p.hall || 'RASG-2', p.place || '', p.cat || 'অন্যান্য', p.pri || 'সাধারণ', p.desc, 'খোলা', p.owner || '', '', ts, '']);
    return { id: id };
  }
  var sh = sheet_(TAB.ISSUES), ids = sh.getRange(1, 1, sh.getLastRow(), 1).getDisplayValues();
  for (var i = 1; i < ids.length; i++) {
    if (ids[i][0] === p.id) {
      var closed = p.status === 'সমাধান হয়েছে' ? ts : '';
      sh.getRange(i + 1, 9, 1, 5).setValues([[p.status || 'খোলা', p.owner || '', p.fix || '', ts + ' (' + u.name + ')', closed]]);
      return { id: p.id };
    }
  }
  throw new Error('সমস্যাটি পাওয়া যায়নি');
}

/* ---------- ড্যাশবোর্ড ---------- */
function apiDashboard(a) {
  auth_(a);
  var fb = rows_(TAB.MASTER).slice(-3000).map(function (r) {
    return { ts: r[0], id: r[1], type: r[2], by: r[3], role: r[4], floor: r[5], room: r[6], worker: r[7], from: r[8], to: r[9], avg: Number(r[10]) || 0, s: r[11], why: r[12], comment: r[13], detail: r[14] };
  });
  return { feedback: fb, issues: apiIssues(a), today: todayIso_() };
}
