/* Rithub gym log — double-progression engine, localStorage only. */
(function () {
'use strict';

var STORE_KEY = 'rithub-gym-v1';
var GOAL_MONTHS = ['2026-08','2026-09','2026-10','2026-11','2026-12'];

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
if (!state.settings) state = defaultState();
Object.keys(DEFAULT_EXERCISES).forEach(function (id) {
  if (!state.settings.exercises[id])
    state.settings.exercises[id] = JSON.parse(JSON.stringify(DEFAULT_EXERCISES[id]));
});

function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
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
function suggest(exId) {
  var cfg = ex(exId), sess = sessionsFor(exId);
  if (!sess.length)
    return { weight:null, note:'first log — enter current weight', bump:false, stuck:0, last:null };
  var last = entryIn(sess[0], exId);
  var hi = cfg.reps[1], lo = cfg.reps[0];
  var hitTop = last.reps.length >= cfg.sets &&
    last.reps.every(function (r) { return r >= hi; });
  var stuck = 0;
  for (var i = 0; i < sess.length; i++) {
    var e = entryIn(sess[i], exId);
    if (e && e.weight === last.weight) stuck++; else break;
  }
  if (cfg.mode === 'assist') {
    if (hitTop) return { weight:round2(Math.max(0, last.weight - cfg.inc)),
      note:'hit top — drop assistance by ' + cfg.inc + ' lb', bump:true, stuck:stuck, last:last };
    return { weight:last.weight,
      note:'target ' + hi + ' reps x ' + cfg.sets + ', then drop assistance', bump:false, stuck:stuck, last:last };
  }
  if (hitTop) return { weight:round2(last.weight + cfg.inc),
    note:'hit top — add ' + cfg.inc + ' lb', bump:true, stuck:stuck, last:last };
  return { weight:last.weight,
    note:'target ' + hi + ' reps x ' + cfg.sets + ', then add weight', bump:false, stuck:stuck, last:last };
}

/* ---------- 01 log ---------- */
var curDay = 'push';

function parseReps(str, sets) {
  var parts = String(str || '').split(/[,，\s]+/)
    .map(function (s) { return parseInt(s, 10); })
    .filter(function (n) { return !isNaN(n) && n > 0; });
  if (!parts.length) return [];
  if (parts.length === 1) { var a = []; for (var i=0;i<sets;i++) a.push(parts[0]); return a; }
  return parts;
}

function renderLog() {
  var list = document.getElementById('exerciseList');
  list.innerHTML = '';
  Object.keys(state.settings.exercises).forEach(function (id) {
    if (ex(id).days.indexOf(curDay) < 0) return;
    var cfg = ex(id), s = suggest(id);
    var div = document.createElement('div');
    div.className = 'exblock';
    var sug = s.weight === null ? s.note :
      ('suggest ' + s.weight + ' lb · ' + s.note +
       (s.stuck > 1 ? ' · ' + s.last.weight + ' lb for ' + s.stuck + ' sessions' : ''));
    div.innerHTML =
      '<div class="exname">' + cfg.name + '</div>' +
      '<div class="exsuggest' + (s.bump ? ' bump' : '') + '">' + sug + '</div>' +
      '<div class="exinputs">' +
        '<label><span class="row-label">WEIGHT (LB)</span><input type="number" step="0.5" min="0" data-ex="' + id + '" data-f="weight" value="' + (s.weight === null ? '' : s.weight) + '"></label>' +
        '<label><span class="row-label">SETS</span><input type="number" min="1" max="10" data-ex="' + id + '" data-f="sets" value="' + cfg.sets + '"></label>' +
        '<label><span class="row-label">REPS</span><input data-ex="' + id + '" data-f="reps" placeholder="10 or 10,10,8" style="width:130px"></label>' +
      '</div>';
    list.appendChild(div);
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
    var cfg = ex(e.ex), mb = state.monthlyBests[m];
    if (cfg.mode === 'assist') {
      if (!state.bests[e.ex] || e.weight < state.bests[e.ex].weight)
        state.bests[e.ex] = { weight:e.weight, date:log.date };
      if (mb[e.ex] === undefined || e.weight < mb[e.ex]) mb[e.ex] = e.weight;
    } else {
      if (!state.bests[e.ex] || e.weight > state.bests[e.ex].weight)
        state.bests[e.ex] = { weight:e.weight, date:log.date };
      if (mb[e.ex] === undefined || e.weight > mb[e.ex]) mb[e.ex] = e.weight;
    }
  });
}

document.getElementById('saveBtn').addEventListener('click', function () {
  var date = document.getElementById('logDate').value || todayStr();
  var entries = [];
  Array.prototype.forEach.call(document.querySelectorAll('#exerciseList .exblock'), function (row) {
    var id = row.querySelector('[data-f="weight"]').dataset.ex;
    var weight = parseFloat(row.querySelector('[data-f="weight"]').value);
    var sets = parseInt(row.querySelector('[data-f="sets"]').value, 10) || ex(id).sets;
    var reps = parseReps(row.querySelector('[data-f="reps"]').value, sets);
    if (isNaN(weight)) return;
    entries.push({ ex:id, weight:round2(weight), sets:sets, reps:reps });
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
    if (s.stuck > 1) out.push('  stuck   ' + s.last.weight + ' lb for ' + s.stuck + ' sessions');
    sessionsFor(id).slice(0,3).forEach(function (l) {
      var e = entryIn(l, id);
      out.push('  ' + l.date.slice(5) + '   ' + e.weight + ' x ' + e.sets + '  (' + e.reps.join(',') + ')');
    });
    out.push('');
  });
  document.getElementById('progressPre').textContent =
    out.length ? out.join('\n') : 'no key lifts logged yet';
}

/* ---------- 03 month goals (text) ---------- */
function renderGoals() {
  var ids = keyIds();
  var head = pad('MONTH', 10) + ids.map(function (id) {
    return pad(ex(id).name.toUpperCase().slice(0,14), 16); }).join('');
  var lines = [head];
  GOAL_MONTHS.forEach(function (m) {
    var row = pad(m, 10);
    ids.forEach(function (id) {
      var cfg = ex(id);
      var g = (state.goals[m] || {})[id];
      var a = (state.monthlyBests[m] || {})[id];
      var cell;
      if (g === undefined || g === '') cell = '--';
      else {
        var met = a !== undefined && (cfg.mode === 'assist' ? a <= g : a >= g);
        cell = g + (a !== undefined ? ' / ' + a : '') + (met ? ' ✓' : '');
      }
      row += pad(cell, 16);
    });
    lines.push(row);
  });
  lines.push('');
  lines.push('target / actual best · ✓ = met · assist: lower is better');
  document.getElementById('goalsPre').textContent = lines.join('\n');
}

function renderGoalEditor() {
  var sel = document.getElementById('goalMonth');
  if (!sel.options.length)
    GOAL_MONTHS.forEach(function (m) {
      var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o);
    });
  var wrap = document.getElementById('goalEditor');
  function draw() {
    var m = sel.value;
    wrap.innerHTML = '';
    keyIds().forEach(function (id) {
      var g = (state.goals[m] || {})[id];
      var row = document.createElement('div');
      row.className = 'goalrow';
      row.innerHTML = '<span class="gname">' + ex(id).name + '</span>' +
        '<input type="number" step="0.5" min="0" value="' + (g === undefined ? '' : g) + '" placeholder="target lb">';
      row.querySelector('input').addEventListener('change', function (e) {
        var v = parseFloat(e.target.value);
        if (!state.goals[m]) state.goals[m] = {};
        if (isNaN(v)) delete state.goals[m][id]; else state.goals[m][id] = round2(v);
        save(); renderGoals();
      });
      wrap.appendChild(row);
    });
  }
  sel.onchange = draw;
  draw();
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

/* ---------- init ---------- */
function renderAll() { renderLog(); renderProgress(); renderGoals(); renderSettings(); }
document.getElementById('logDate').value = todayStr();
renderGoalEditor();
renderAll();

})();
