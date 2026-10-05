/* Rithub gym log — double-progression engine, localStorage only. */
(function () {
'use strict';

var STORE_KEY = 'rithub-gym-v1';
/* rolling goal months: 2 back + 5 forward, plus any month that already has goals */
function goalMonths() {
  var out = [], d = new Date();
  d.setDate(1); d.setMonth(d.getMonth() - 2);
  for (var i = 0; i < 8; i++) {
    var m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (out.indexOf(m) < 0) out.push(m);
    d.setMonth(d.getMonth() + 1);
  }
  Object.keys(state.goals || {}).forEach(function (m) {
    if (out.indexOf(m) < 0) out.push(m);
  });
  return out.sort();
}

var DEFAULT_EXERCISES = {
  'db-incline':       { name:'Dumbbell incline chest',  days:['push'],        inc:2.5, reps:[8,12],  sets:3, mode:'std',    key:true  },
  'db-overhead':      { name:'Dumbbell overhead',       days:['push'],        inc:2.5, reps:[8,12],  sets:3, mode:'std',    key:true  },
  'lateral-raise':    { name:'Lateral raise',           days:['push'],        inc:2.5, reps:[10,15], sets:3, mode:'std',    key:false },
  'tricep-ext':       { name:'Tricep extension',        days:['push'],        inc:2.5, reps:[8,12],  sets:3, mode:'std',    key:false },
  'tricep-pushdown':  { name:'Tricep pushdown',         days:['push'],        inc:5,   reps:[8,12],  sets:3, mode:'std',    key:false },
  'assisted-pullup':  { name:'Assisted pull-ups',       days:['pull'],        inc:5,   reps:[6,10],  sets:3, mode:'assist', key:true  },
  'lat-pulldown':     { name:'Lat pulldown',            days:['pull'],        inc:5,   reps:[8,12],  sets:3, mode:'std',    key:true  },
  'db-row':           { name:'Dumbbell row',            days:['pull'],        inc:2.5, reps:[8,12],  sets:3, mode:'std',    key:true  },
  'bicep-curl':       { name:'Bicep curl',              days:['pull'],        inc:2.5, reps:[8,12],  sets:3, mode:'std',    key:false },
  'decline-situp':    { name:'Weighted decline sit-up', days:['pull','legs'], inc:2.5, reps:[10,15], sets:3, mode:'std',    key:false },
  'front-squat':      { name:'Front squat',             days:['legs'],        inc:5,   reps:[6,10],  sets:4, mode:'std',    key:true  },
  'v-squat':          { name:'V squat',                 days:['legs'],        inc:10,  reps:[8,12],  sets:3, mode:'std',    key:true  },
  'leg-ext':          { name:'Leg extension',           days:['legs'],        inc:5,   reps:[10,15], sets:3, mode:'std',    key:false },
  'leg-curl':         { name:'Leg curl',                days:['legs'],        inc:5,   reps:[10,15], sets:3, mode:'std',    key:false }
};

function defaultState() {
  return { logs:[], bests:{}, monthlyBests:{}, goals:{},
    settings:{ retentionDays:90, exercises:JSON.parse(JSON.stringify(DEFAULT_EXERCISES)) } };
}

var state;
try { state = JSON.parse(localStorage.getItem(STORE_KEY)) || defaultState(); }
catch (e) { state = defaultState(); }
function ensureExerciseDefaults() {
  if (!state.settings) state = defaultState();
  Object.keys(DEFAULT_EXERCISES).forEach(function (id) {
    if (!state.settings.exercises[id])
      state.settings.exercises[id] = JSON.parse(JSON.stringify(DEFAULT_EXERCISES[id]));
  });
}
ensureExerciseDefaults();

var GYM_UPDATED_KEY = 'rithub-gym-updated';
try { var gymUpdatedAt = localStorage.getItem(GYM_UPDATED_KEY) || null; }
catch (e) { var gymUpdatedAt = null; }

function persistGym() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  if (gymUpdatedAt) { try { localStorage.setItem(GYM_UPDATED_KEY, gymUpdatedAt); } catch (e) {} }
}
function save() {
  gymUpdatedAt = new Date().toISOString();
  persistGym();
  gymSchedulePush();
}
function ex(id) { return state.settings.exercises[id]; }
function round2(n) { return Math.round(n * 100) / 100; }
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function todayStr() {
  var d = new Date(), p = function (n) { return String(n).padStart(2,'0'); };
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
}

/* ---------- retention ---------- */
(function prune() {
  var days = state.settings.retentionDays || 90;
  var c = new Date(); c.setDate(c.getDate() - days);
  var cstr = c.toISOString().slice(0,10);
  var before = state.logs.length;
  state.logs = state.logs.filter(function (l) { return l.date >= cstr; });
  if (state.logs.length !== before) save();
})();

/* ---------- suggestion engine: double progression ---------- */
function sessionsFor(exId) {
  return state.logs
    .filter(function (l) { return l.entries.some(function (e) { return e.ex === exId; }); })
    .sort(function (a,b) { return b.date.localeCompare(a.date); });
}
function entryIn(log, exId) {
  return log.entries.filter(function (e) { return e.ex === exId; })[0];
}
/*
   Entry shape v2: { ex, sets:[{w, r}, ...] } — every set
   carries its own weight + reps. v1 entries were
   { ex, weight, sets:n, reps:[...] }; the helpers
   below normalize both so old logs keep working.
*/
function entrySets(e) {
  if (e.sets && Array.isArray(e.sets)) return e.sets;
  var reps = e.reps || [];
  var n = (typeof e.sets === 'number') ? e.sets : reps.length;
  var out = [];
  for (var i = 0; i < n; i++)
    out.push({ w: (typeof e.weight === 'number' ? e.weight : null),
               r: (reps[i] !== undefined ? reps[i] : null) });
  return out;
}
function entryWeight(e) {
  if (typeof e.weight === 'number') return e.weight;
  var ws = entrySets(e).map(function (s) { return s.w; })
    .filter(function (w) { return typeof w === 'number'; });
  return ws.length ? Math.max.apply(null, ws) : null;
}
function entryReps(e) {
  return entrySets(e).map(function (s) { return s.r; })
    .filter(function (r) { return typeof r === 'number'; });
}
function suggest(exId) {
  var cfg = ex(exId), sess = sessionsFor(exId);
  if (!sess.length)
    return { weight:null, note:'first log — enter current weight', bump:false, stuck:0, last:null };
  var last = entryIn(sess[0], exId);
  var hi = cfg.reps[1], lo = cfg.reps[0];
  var lastReps = entryReps(last), lastW = entryWeight(last);
  var hitTop = lastReps.length >= cfg.sets &&
    lastReps.every(function (r) { return r >= hi; });
  var stuck = 0;
  for (var i = 0; i < sess.length; i++) {
    var e = entryIn(sess[i], exId);
    if (e && entryWeight(e) === lastW) stuck++; else break;
  }
  if (cfg.mode === 'assist') {
    if (hitTop) return { weight:round2(Math.max(0, lastW - cfg.inc)),
      note:'hit top — drop assistance by ' + cfg.inc + ' lb', bump:true, stuck:stuck, last:last };
    return { weight:lastW,
      note:'target ' + hi + ' reps x ' + cfg.sets + ', then drop assistance', bump:false, stuck:stuck, last:last };
  }
  if (hitTop) return { weight:round2(lastW + cfg.inc),
    note:'hit top — add ' + cfg.inc + ' lb', bump:true, stuck:stuck, last:last };
  return { weight:lastW,
    note:'target ' + hi + ' reps x ' + cfg.sets + ', then add weight', bump:false, stuck:stuck, last:last };
}

/* ---------- 01 log ---------- */
var ROTATION = ['push', 'pull', 'legs'];
function nextUp() {
  if (!state.logs.length) return null;
  var sorted = state.logs.slice().sort(function (a,b) { return b.date.localeCompare(a.date); });
  var last = sorted[0];
  var i = ROTATION.indexOf(last.day);
  return { day: ROTATION[(i + 1) % 3], lastDay: last.day, lastDate: last.date };
}
var curDay = (nextUp() || {}).day || 'push';
var setCounts = {};   /* runtime per-exercise set rows; defaults to cfg.sets */

function syncDayTabs() {
  Array.prototype.forEach.call(document.querySelectorAll('#dayTabs button'), function (x) {
    x.classList.toggle('active', x.dataset.day === curDay);
  });
}
function renderTodayLine() {
  var el = document.getElementById('todayLine');
  var n = nextUp();
  el.innerHTML = n
    ? 'NEXT UP: <b>' + n.day.toUpperCase() + '</b> · last ' + n.lastDate.slice(5) + ' ' + n.lastDay.toUpperCase()
    : 'NEXT UP: -- · log one session to start the rotation';
}

function renderSetRows(block, id) {
  var n = setCounts[id] || ex(id).sets;
  var wrap = block.querySelector('.exsets');
  var vals = [];
  Array.prototype.forEach.call(wrap.querySelectorAll('.exsetrow'), function (sr) {
    vals.push({
      w: sr.querySelector('[data-f="w"]').value,
      r: sr.querySelector('[data-f="r"]').value
    });
  });
  var sugW = suggest(id).weight;
  var html = '';
  for (var i = 0; i < n; i++) {
    var v = vals[i] || {};
    var w = (v.w !== undefined && v.w !== '') ? v.w : (sugW === null ? '' : sugW);
    html += '<div class="exsetrow">' +
      '<span class="setnum">' + (i + 1) + '</span>' +
      '<input type="number" step="0.5" min="0" data-f="w" value="' + w + '" placeholder="lb">' +
      '<input type="number" min="0" data-f="r" value="' + (v.r || '') + '" placeholder="reps">' +
      '</div>';
  }
  wrap.innerHTML = html;
}

function renderLog() {
  var list = document.getElementById('exerciseList');
  list.innerHTML = '';
  Object.keys(state.settings.exercises).forEach(function (id) {
    if (ex(id).days.indexOf(curDay) < 0) return;
    var cfg = ex(id), s = suggest(id);
    var div = document.createElement('div');
    div.className = 'exblock';
    var lastW = s.last ? entryWeight(s.last) : null;
    var sug = s.weight === null ? s.note :
      ('suggest ' + s.weight + ' lb · ' + s.note +
       (s.stuck > 1 && lastW !== null ? ' · ' + lastW + ' lb for ' + s.stuck + ' sessions' : ''));
    div.innerHTML =
      '<div class="exname">' + cfg.name + '</div>' +
      '<div class="exsuggest' + (s.bump ? ' bump' : '') + '">' + sug + '</div>' +
      '<div class="sethead">' +
        '<span class="setnum"></span>' +
        '<span class="setcol">WEIGHT (LB)</span>' +
        '<span class="setcol">REPS</span>' +
        '<label class="setsctrl"><span>SETS</span>' +
        '<button type="button" class="stepbtn" data-step="-1">\u2212</button>' +
        '<input type="number" min="1" max="10" data-nsets="' + id + '" value="' + (setCounts[id] || cfg.sets) + '">' +
        '<button type="button" class="stepbtn" data-step="1">+</button></label>' +
      '</div>' +
      '<div class="exsets"></div>';
    list.appendChild(div);
    renderSetRows(div, id);
    function applySets(nv) {
      if (nv >= 1 && nv <= 10) {
        setCounts[id] = nv;
        div.querySelector('[data-nsets]').value = nv;
        renderSetRows(div, id);
      } else {
        div.querySelector('[data-nsets]').value = setCounts[id] || cfg.sets;
      }
    }
    div.querySelector('[data-nsets]').addEventListener('change', function (e) {
      applySets(parseInt(e.target.value, 10));
    });
    Array.prototype.forEach.call(div.querySelectorAll('[data-step]'), function (btn) {
      btn.addEventListener('click', function () {
        var cur = setCounts[id] || cfg.sets;
        applySets(cur + parseInt(btn.dataset.step, 10));
      });
    });
  });
}

function flash(msg) {
  var m = document.getElementById('saveMsg');
  m.textContent = msg;
  setTimeout(function () { m.textContent = ''; }, 2500);
}

function recordBests(log) {
  var m = log.date.slice(0,7);
  if (!state.monthlyBests[m]) state.monthlyBests[m] = {};
  log.entries.forEach(function (e) {
    var cfg = ex(e.ex), mb = state.monthlyBests[m], w = entryWeight(e);
    if (w === null) return;
    if (cfg.mode === 'assist') {
      if (!state.bests[e.ex] || w < state.bests[e.ex].weight)
        state.bests[e.ex] = { weight:w, date:log.date };
      if (mb[e.ex] === undefined || w < mb[e.ex]) mb[e.ex] = w;
    } else {
      if (!state.bests[e.ex] || w > state.bests[e.ex].weight)
        state.bests[e.ex] = { weight:w, date:log.date };
      if (mb[e.ex] === undefined || w > mb[e.ex]) mb[e.ex] = w;
    }
  });
}

document.getElementById('saveBtn').addEventListener('click', function () {
  var date = document.getElementById('logDate').value || todayStr();
  var entries = [];
  Array.prototype.forEach.call(document.querySelectorAll('#exerciseList .exblock'), function (row) {
    var id = row.querySelector('[data-nsets]').dataset.nsets;
    var sets = [];
    Array.prototype.forEach.call(row.querySelectorAll('.exsetrow'), function (sr) {
      var w = parseFloat(sr.querySelector('[data-f="w"]').value);
      var r = parseInt(sr.querySelector('[data-f="r"]').value, 10);
      if (isNaN(w)) return;
      sets.push({ w:round2(w), r:(isNaN(r) ? null : r) });
    });
    if (!sets.length) return;
    entries.push({ ex:id, sets:sets });
  });
  if (!entries.length) { flash('enter at least one weight'); return; }
  var log = { date:date, day:curDay, entries:entries };
  var idx = -1;
  state.logs.forEach(function (l, i) { if (l.date === date && l.day === curDay) idx = i; });
  if (idx >= 0) { state.logs[idx] = log; flash('updated ' + date + ' ' + curDay); }
  else { state.logs.push(log); flash('saved ' + date + ' ' + curDay + ' · ' + entries.length + ' lifts'); }
  recordBests(log);
  save(); renderAll();
});

document.getElementById('dayTabs').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  Array.prototype.forEach.call(document.querySelectorAll('#dayTabs button'),
    function (x) { x.classList.remove('active'); });
  b.classList.add('active'); curDay = b.dataset.day;
  renderLog();
});

/* ---------- 02 progress (text) ---------- */
function keyIds() {
  return Object.keys(state.settings.exercises).filter(function (id) { return ex(id).key; });
}
function renderProgress() {
  var out = [];
  keyIds().forEach(function (id) {
    var cfg = ex(id), s = suggest(id), b = state.bests[id];
    out.push(cfg.name.toUpperCase());
    out.push('  best    ' + (b ? b.weight + ' lb · ' + b.date.slice(5) : '--'));
    out.push('  next    ' + (s.weight === null ? 'log once first'
      : s.weight + ' lb x ' + cfg.sets + '  (' + s.note + ')'));
    if (s.stuck > 1) out.push('  stuck   ' + entryWeight(s.last) + ' lb for ' + s.stuck + ' sessions');
    sessionsFor(id).slice(0,3).forEach(function (l) {
      var e = entryIn(l, id);
      out.push('  ' + l.date.slice(5) + '   ' + entrySets(e).map(function (st) {
        return (st.w === null ? '?' : st.w) + 'x' + (st.r === null ? '?' : st.r);
      }).join(', '));
    });
    out.push('');
  });
  document.getElementById('progressPre').textContent =
    out.length ? out.join('\n') : 'no key lifts logged yet';
}

/* ---------- 03 month goals (text) ---------- */
/* goal shape: { w: lb, reps: n } — met when any single set in one
   session that month hits weight x reps. Old shapes normalized. */
function goalOf(m, id) {
  var g = (state.goals[m] || {})[id];
  if (g === undefined || g === '') return undefined;
  if (typeof g === 'number') return { w:g, reps:ex(id).reps[1] };
  return { w:g.w, reps:(g.reps === undefined || g.reps === null ? ex(id).reps[1] : g.reps) };
}
function goalMet(id, m, g) {
  var cfg = ex(id);
  return sessionsFor(id).some(function (l) {
    if (l.date.slice(0, 7) !== m) return false;
    var e = entryIn(l, id);
    if (!e) return false;
    return entrySets(e).some(function (st) {
      if (st.w === null || st.r === null) return false;
      var wok = cfg.mode === 'assist' ? st.w <= g.w : st.w >= g.w;
      return wok && st.r >= g.reps;
    });
  });
}
function renderGoals() {
  var ids = keyIds();
  var head = pad('MONTH', 10) + ids.map(function (id) {
    return pad(ex(id).name.toUpperCase().slice(0,14), 18); }).join('');
  var lines = [head];
  goalMonths().forEach(function (m) {
    var row = pad(m, 10);
    ids.forEach(function (id) {
      var g = goalOf(m, id);
      var a = (state.monthlyBests[m] || {})[id];
      var cell;
      if (g === undefined) cell = '--';
      else {
        cell = g.w + 'x' + g.reps +
          (a !== undefined ? ' / ' + a : '') +
          (goalMet(id, m, g) ? ' ✓' : '');
      }
      row += pad(cell, 18);
    });
    lines.push(row);
  });
  lines.push('');
  lines.push('goal: lb x reps / month best · ✓ = hit it in one set that month · assist: lower is better');
  document.getElementById('goalsPre').textContent = lines.join('\n');
}

function renderGoalEditor() {
  var sel = document.getElementById('goalMonth');
  if (!sel.options.length)
    goalMonths().forEach(function (m) {
      var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o);
    });
  var wrap = document.getElementById('goalEditor');
  function draw() {
    var m = sel.value;
    wrap.innerHTML = '';
    keyIds().forEach(function (id) {
      var cfg = ex(id), g = goalOf(m, id) || {};
      var row = document.createElement('div');
      row.className = 'goalrow';
      row.innerHTML = '<span class="gname">' + cfg.name + '</span>' +
        '<label class="row-label">LB<br><input type="number" step="0.5" min="0" data-k="w" style="width:64px" value="' + (g.w === undefined ? '' : g.w) + '"></label>' +
        '<label class="row-label">REPS<br><input type="number" min="1" data-k="reps" style="width:52px" placeholder="' + cfg.reps[1] + '" value="' + (g.reps === undefined ? '' : g.reps) + '"></label>';
      Array.prototype.forEach.call(row.querySelectorAll('input'), function (inp) {
        inp.addEventListener('change', function () { readGoalRow(m, id, row); });
      });
      wrap.appendChild(row);
    });
  }
  sel.onchange = draw;
  draw();
}

function readGoalRow(m, id, row) {
  var cfg = ex(id);
  function val(k) {
    var el = row.querySelector('[data-k="' + k + '"]');
    return el ? parseFloat(el.value) : NaN;
  }
  var w = val('w'), reps = val('reps');
  if (!state.goals[m]) state.goals[m] = {};
  if (isNaN(w)) delete state.goals[m][id];
  else state.goals[m][id] = { w:round2(w),
    reps:isNaN(reps) ? cfg.reps[1] : Math.max(1, Math.round(reps)) };
  save(); renderGoals();
}

/* ---------- 04 settings ---------- */
function renderSettings() {
  document.getElementById('retentionInput').value = state.settings.retentionDays;
  var wrap = document.getElementById('exSettings');
  wrap.innerHTML = '';
  Object.keys(state.settings.exercises).forEach(function (id) {
    var c = ex(id);
    var row = document.createElement('div');
    row.className = 'setrow';
    row.innerHTML =
      '<span class="sname">' + c.name + '</span>' +
      '<label class="row-label">INC<br><input type="number" step="0.5" min="0" data-k="inc" value="' + c.inc + '"></label>' +
      '<label class="row-label">REPS<br><input type="number" min="1" data-k="reps0" value="' + c.reps[0] + '" style="width:44px">-<input type="number" min="1" data-k="reps1" value="' + c.reps[1] + '" style="width:44px"></label>' +
      '<label class="row-label">SETS<br><input type="number" min="1" max="10" data-k="sets" value="' + c.sets + '"></label>' +
      '<label class="row-label">KEY<br><input type="checkbox" data-k="key"' + (c.key ? ' checked' : '') + '></label>' +
      '<span class="row-label">' + (c.mode === 'assist' ? 'ASSIST↓' : 'LOAD↑') + '</span>';
    row.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var k = inp.dataset.k;
        if (k === 'inc' || k === 'sets') c[k] = parseFloat(inp.value) || c[k];
        else if (k === 'reps0') c.reps[0] = parseInt(inp.value, 10) || c.reps[0];
        else if (k === 'reps1') c.reps[1] = parseInt(inp.value, 10) || c.reps[1];
        else if (k === 'key') c.key = inp.checked;
        save(); renderAll();
      });
    });
    wrap.appendChild(row);
  });
}

document.getElementById('retentionInput').addEventListener('change', function (e) {
  var v = parseInt(e.target.value, 10);
  if (v >= 7 && v <= 365) { state.settings.retentionDays = v; save(); }
});
document.getElementById('gymSyncBtn').addEventListener('click', function () { gymSyncNow(); });
document.getElementById('exportBtn').addEventListener('click', function () {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rithub-gym-backup-' + todayStr() + '.json';
  a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById('importFile').addEventListener('change', function (e) {
  if (!e.target.files[0]) return;
  var r = new FileReader();
  r.onload = function () {
    try {
      var d = JSON.parse(r.result);
      if (!d.settings || !d.settings.exercises) throw new Error('bad file');
      state = d; save(); renderAll(); flash('imported');
    } catch (err) { flash('import failed'); }
  };
  r.readAsText(e.target.files[0]); e.target.value = '';
});
document.getElementById('clearBtn').addEventListener('click', function () {
  if (confirm('Delete ALL gym data? Export a backup first.'))
    { state = defaultState(); save(); renderAll(); }
});

/* ---------- 05 cloud sync ----------
   Reuses the Rithub tracker's token + gist id (same origin, shared
   localStorage key 'rithub-cloud'); gym data lives in gym.json
   inside that same gist, so the tracker's rithub.json is untouched. */
var GYM_SYNC_META_KEY = 'rithub-gym-cloud-meta';
var GYM_GIST_FILE = 'gym.json';
var gymPushTimer = null;

function gymCloudConfig() {
  try { return JSON.parse(localStorage.getItem('rithub-cloud')); }
  catch (e) { return null; }
}
function gymSyncMeta() {
  try { return JSON.parse(localStorage.getItem(GYM_SYNC_META_KEY)) || {}; }
  catch (e) { return {}; }
}
function setGymSyncMeta(patch) {
  var meta = gymSyncMeta();
  Object.keys(patch).forEach(function (k) { meta[k] = patch[k]; });
  try { localStorage.setItem(GYM_SYNC_META_KEY, JSON.stringify(meta)); } catch (e) {}
}
function gymSetStatus(t) {
  var el = document.getElementById('gymSyncMsg');
  if (el) el.textContent = t;
}
async function gymGhApi(path, token, options) {
  options = options || {};
  var res = await fetch('https://api.github.com' + path, {
    method: options.method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    var detail = '';
    try { var err = await res.json(); detail = err.message ? ' \u2014 ' + err.message : ''; }
    catch (e) {}
    throw new Error('GitHub ' + res.status + detail);
  }
  if (res.status === 204) return null;
  return res.json();
}
function gymEnvelope() { return { updatedAt: gymUpdatedAt, data: state }; }
function countGymEntries(st) {
  if (!st || !st.logs) return 0;
  return st.logs.reduce(function (n, l) { return n + (l.entries ? l.entries.length : 0); }, 0);
}
function stampGymUpdatedAt() {
  if (!gymUpdatedAt) { gymUpdatedAt = new Date().toISOString(); persistGym(); }
}
async function gymFetchRemote(cfg) {
  var gist = await gymGhApi('/gists/' + cfg.gistId, cfg.token);
  var file = gist.files && gist.files[GYM_GIST_FILE];
  if (!file || !file.content) return null;
  try {
    var data = JSON.parse(file.content);
    if (data && data.data && data.data.settings && data.data.settings.exercises) return data;
  } catch (e) {}
  return null;
}
function gymAdoptRemote(remote) {
  state = remote.data;
  ensureExerciseDefaults();
  gymUpdatedAt = remote.updatedAt || new Date().toISOString();
  persistGym();
  setGymSyncMeta({ lastSyncAt: remote.updatedAt });
  renderAll();
}
async function gymPushEnvelope(cfg) {
  stampGymUpdatedAt();
  var meta = gymSyncMeta();
  var remote = await gymFetchRemote(cfg);
  if (remote && remote.updatedAt && gymUpdatedAt && remote.updatedAt > gymUpdatedAt &&
      (!meta.lastSyncAt || remote.updatedAt > meta.lastSyncAt)) {
    gymAdoptRemote(remote);
    return 'pulled';
  }
  var files = {};
  files[GYM_GIST_FILE] = { content: JSON.stringify(gymEnvelope()) };
  await gymGhApi('/gists/' + cfg.gistId, cfg.token,
    { method: 'PATCH', body: { files: files } });
  setGymSyncMeta({ lastSyncAt: gymUpdatedAt });
  return 'pushed';
}
function gymSchedulePush() {
  if (!gymCloudConfig()) return;
  if (gymPushTimer) clearTimeout(gymPushTimer);
  gymSetStatus('syncing\u2026');
  gymPushTimer = setTimeout(async function () {
    try {
      var r = await gymPushEnvelope(gymCloudConfig());
      gymSetStatus(r === 'pulled' ? 'pulled newer cloud copy' : 'synced');
    } catch (e) { gymSetStatus('sync failed: ' + e.message); }
  }, 2000);
}
async function gymSyncNow() {
  var cfg = gymCloudConfig();
  if (!cfg || !cfg.token || !cfg.gistId) {
    gymSetStatus('not configured \u2014 set up sync on the Rithub home page first');
    return 'unconfigured';
  }
  gymSetStatus('syncing\u2026');
  try {
    var remote = await gymFetchRemote(cfg);
    if (!remote) { await gymPushEnvelope(cfg); gymSetStatus('pushed'); return 'pushed'; }
    if (!remote.updatedAt) {
      var rN = countGymEntries(remote.data), lN = countGymEntries(state);
      if (rN > 0 && lN === 0) {
        gymAdoptRemote(remote); gymSetStatus('pulled ' + rN + ' entries'); return 'pulled';
      }
      await gymPushEnvelope(cfg); gymSetStatus('pushed ' + lN + ' entries'); return 'pushed';
    }
    if (!gymUpdatedAt || remote.updatedAt > gymUpdatedAt) {
      gymAdoptRemote(remote); gymSetStatus('pulled'); return 'pulled';
    }
    if (gymUpdatedAt > remote.updatedAt) {
      await gymPushEnvelope(cfg); gymSetStatus('pushed'); return 'pushed';
    }
    gymSetStatus('up to date'); return 'up to date';
  } catch (e) { gymSetStatus('sync failed: ' + e.message); return 'failed'; }
}

/* ---------- init ---------- */
function renderAll() { syncDayTabs(); renderTodayLine(); renderLog(); renderProgress(); renderGoals(); renderSettings(); }
document.getElementById('logDate').value = todayStr();
renderGoalEditor();
renderAll();
gymSyncNow();

})();
