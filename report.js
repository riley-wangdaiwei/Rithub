/* =====================================================
   RITHUB · TIME REPORT
   Pure functions — no DOM. Computes text graphs from
   commit timestamps (+ measured durationMin where it
   exists). Runs in the browser and under Node tests.

   Honesty rule: "~" marks estimated values, measured
   values carry no mark. Never mixed silently.
===================================================== */

/*
   Pure time helpers — shared with app.js, which
   loads this file first. Also exercised by tests.
*/

function timerElapsedMs(
  startedAtIso,
  nowMs
) {

  const startMs =
    Date.parse(
      startedAtIso
    );


  if (isNaN(startMs)) {

    return 0;

  }


  return Math.max(
    0,
    nowMs - startMs
  );

}


function timerElapsedMin(
  startedAtIso,
  nowMs
) {

  return Math.max(

    1,

    Math.round(

      timerElapsedMs(
        startedAtIso,
        nowMs
      ) / 60000

    )

  );

}


function formatElapsed(ms) {

  const totalSec =
    Math.floor(
      ms / 1000
    );


  const h =
    Math.floor(
      totalSec / 3600
    );


  const m =
    String(
      Math.floor(
        (totalSec % 3600) / 60
      )
    ).padStart(
      2,
      "0"
    );


  const s =
    String(
      totalSec % 60
    ).padStart(
      2,
      "0"
    );


  return (
    h > 0
      ? h + ":"
      : ""
  ) + m + ":" + s;

}


const SPARK_CHARS =
  ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

const WAKE_START = 8;   /* 08:00 */
const WAKE_END = 24;    /* 24:00, exclusive */

const DEEP_START_MIN = 21 * 60;        /* 21:00 */
const DEEP_END_MIN = 22 * 60 + 30;     /* 22:30 */

const MONTHS =
  ["JAN","FEB","MAR","APR","MAY","JUN",
   "JUL","AUG","SEP","OCT","NOV","DEC"];


function pad2(n) {

  return String(n).padStart(2, "0");

}


function dayStartMs(ms) {

  const d = new Date(ms);

  d.setHours(0, 0, 0, 0);

  return d.getTime();

}


function dayLabel(ms) {

  const d = new Date(ms);

  return (
    pad2(d.getMonth() + 1) +
    "-" +
    pad2(d.getDate())
  );

}


function fmtDate(ms) {

  const d = new Date(ms);

  return (
    pad2(d.getDate()) +
    " " +
    MONTHS[d.getMonth()]
  );

}


function hourOf(ms) {

  return new Date(ms).getHours();

}


/*
   Flatten every commit into {t, project, durationMin}.
   Skips broken timestamps and far-future clock skew.
   Cancelled projects are excluded from the report.
*/

function collectCommits(projects, nowMs) {

  const out = [];


  (projects || []).forEach(p => {

    if (p.cancelled) return;


    (p.commits || []).forEach(c => {

      const t = Date.parse(c.createdAt);


      if (isNaN(t) || t > nowMs + 3600000) {

        return;

      }


      let dur = null;


      if (
        typeof c.durationMin === "number" &&
        isFinite(c.durationMin) &&
        c.durationMin > 0
      ) {

        dur = Math.round(c.durationMin);

      }


      out.push({

        t: t,

        project: String(p.name || "?"),

        durationMin: dur,

        deep: !!c.deep

      });

    });

  });


  out.sort((a, b) => a.t - b.t);

  return out;

}


function projectNames(projects) {

  return (projects || [])
    .filter(p => !p.cancelled)
    .map(p => String(p.name || "?"));

}


/*
   Drop commits older than `days` (rolling window).
   Conservative on purpose: a commit whose
   createdAt can't be parsed is KEPT — never
   delete on a guess. Returns new project objects
   for pruned projects; untouched projects keep
   their reference. Input is never mutated.
*/

function pruneOldCommits(projects, nowMs, days) {

  days = days || 7;

  const cutoff = nowMs - days * 86400000;


  return (projects || []).map(p => {

    const commits = p.commits || [];


    const kept = commits.filter(c => {

      const t = Date.parse(c && c.createdAt);


      if (isNaN(t)) return true;


      return t >= cutoff;

    });


    if (kept.length === commits.length) {

      return p;

    }


    const np = {};

    for (const k in p) np[k] = p[k];

    np.commits = kept;

    return np;

  });

}


function sparkline(values) {

  const max =
    Math.max.apply(null, values.concat([0]));


  if (max <= 0) {

    return null;

  }


  return values.map(v => {

    const i =
      Math.min(
        7,
        Math.round(v / max * 7)
      );


    return SPARK_CHARS[i];

  }).join("");

}


/*
   Per-hour stats for one local day:
   counts[h]      — commits whose createdAt falls in h
   measured[h]    — measured minutes overlapping h
                    (timer interval [t-dur, t], split
                    across the hours it touches)
*/

function hourlyStats(commits, startMs) {

  const counts = new Array(24).fill(0);

  const measured = new Array(24).fill(0);

  const endMs = startMs + 86400000;


  commits.forEach(c => {

    if (c.t < startMs || c.t >= endMs) {

      return;

    }


    counts[hourOf(c.t)]++;


    if (c.durationMin) {

      const s = c.t - c.durationMin * 60000;


      for (let h = 0; h < 24; h++) {

        const hs = startMs + h * 3600000;

        const he = hs + 3600000;


        const ov =
          Math.max(
            0,
            Math.min(c.t, he) -
            Math.max(s, hs)
          );


        if (ov > 0) {

          measured[h] += ov / 60000;

        }

      }

    }

  });


  return { counts, measured };

}


function hourCovered(h, stats) {

  return (
    stats.counts[h] > 0 ||
    stats.measured[h] > 0
  );

}


function countCovered(stats) {

  let n = 0;


  for (let h = 0; h < 24; h++) {

    if (hourCovered(h, stats)) n++;

  }


  return n;

}


function blankHoursOf(stats) {

  let n = 0;


  for (let h = WAKE_START; h < WAKE_END; h++) {

    if (!hourCovered(h, stats)) n++;

  }


  return n;

}


function wakeWorkHoursOf(stats) {

  let n = 0;


  for (let h = WAKE_START; h < WAKE_END; h++) {

    if (hourCovered(h, stats)) n++;

  }


  return n;

}


/*
   Contiguous blank stretches inside the waking
   window, as [startHour, endHour) pairs.
*/

function blankStretches(stats) {

  const out = [];

  let s = null;


  for (let h = WAKE_START; h <= WAKE_END; h++) {

    const blank =
      h < WAKE_END &&
      !hourCovered(h, stats);


    if (blank && s == null) {

      s = h;

    }


    if (!blank && s != null) {

      out.push([s, h]);

      s = null;

    }

  }


  return out;

}


function deepStartedOn(commits, dayStart) {

  const ws =
    dayStart + DEEP_START_MIN * 60000;

  const we =
    dayStart + DEEP_END_MIN * 60000;


  return commits.some(
    c => c.t >= ws && c.t < we
  );

}


function avgArrays(arrs) {

  const n = arrs[0].length;

  const out = new Array(n).fill(0);


  arrs.forEach(a =>
    a.forEach((v, i) => { out[i] += v; })
  );


  return out.map(v => v / arrs.length);

}


/*
   Hours holding >= 60% of the peak, merged into
   ranges: "21–23" or "9".
*/

function peakRanges(mean) {

  const max =
    Math.max.apply(null, mean.concat([0]));


  if (max <= 0) {

    return null;

  }


  const hot =
    mean
      .map((v, i) => v >= max * 0.6 ? i : -1)
      .filter(i => i >= 0);


  if (!hot.length) {

    return null;

  }


  const ranges = [];

  let s = hot[0], p = hot[0];


  hot.slice(1).forEach(h => {

    if (h === p + 1) {

      p = h;

    } else {

      ranges.push([s, p]);

      s = h;

      p = h;

    }

  });


  ranges.push([s, p]);


  return ranges
    .map(r =>
      r[0] === r[1]
        ? String(r[0])
        : r[0] + "–" + r[1]
    )
    .join(", ");

}


function maxZeroRun(counts) {

  let best = 0, cur = 0;


  counts.forEach(v => {

    if (v === 0) {

      cur++;

      if (cur > best) best = cur;

    } else {

      cur = 0;

    }

  });


  return best;

}


/*
   Consecutive zero-commit days ending today,
   looking back at most maxDays.
*/

function quietStreak(commits, project, todayStart, maxDays) {

  let streak = 0;


  for (let i = 0; i < maxDays; i++) {

    const d = todayStart - i * 86400000;


    const n = commits.filter(
      c =>
        c.project === project &&
        c.t >= d &&
        c.t < d + 86400000
    ).length;


    if (n === 0) {

      streak++;

    } else {

      break;

    }

  }


  return streak;

}


function hourAxis() {

  const a = new Array(26).fill(" ");


  a[0] = "0";

  a[6] = "6";

  a[12] = "1"; a[13] = "2";

  a[18] = "1"; a[19] = "8";

  a[24] = "2"; a[25] = "4";


  return a.join("");

}


/*
   DEEP WEEK grid — 7 rows (rolling last 7 days).
   Dots, like the reference: filled = work, empty =
   unused time, and deep work gets its own mark
   (red on web, ◆ in text).
   deepWeekCells returns 0/1/2 per slot so both the
   text grid and the web dot grid share one source.
*/
function weekdayShort(ms) {

  return (
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      [new Date(ms).getDay()]
  );

}


function last7Days(nowMs) {

  const todayStart =
    dayStartMs(nowMs);

  const days =
    [];


  for (let i = 6; i >= 0; i--) {

    days.push(
      todayStart - i * 86400000
    );

  }


  return days;

}


function deepWeekCells(commits, days, slotMin) {

  const per =
    Math.round(24 * 60 / slotMin);

  const slotMs =
    slotMin * 60000;

  const rows =
    days.map(() => new Array(per).fill(0));


  /*
    Normal first, deep second so deep wins
    overlapping slots.
  */
  [false, true].forEach(isDeep => {

    commits.forEach(c => {

      if (!!c.deep !== isDeep) {

        return;

      }


      const durMs =
        (c.durationMin || 60) * 60000;

      const start =
        c.t;

      const end =
        start + durMs;


      days.forEach((ds, di) => {

        for (let s = 0; s < per; s++) {

          const ss =
            ds + s * slotMs;

          const se =
            ss + slotMs;


          if (start < se && end > ss) {

            rows[di][s] =
              isDeep ? 2 : 1;

          }

        }

      });

    });

  });


  return rows;

}


/*
   Deep-week rates, shared by the text footer and
   the web dot grid.
*/
function deepWeekStats(commits, days) {

  const inWin =
    commits.filter(
      c => c.t >= days[0]
    );


  const deepMin =
    inWin
      .filter(c => c.deep && c.durationMin)
      .reduce((a, c) => a + c.durationMin, 0);

  const totalMin =
    inWin
      .filter(c => c.durationMin)
      .reduce((a, c) => a + c.durationMin, 0);

  const sessions =
    inWin.filter(c => c.deep).length;

  const nights =
    days.filter(ds =>
      inWin.some(
        c =>
          c.deep &&
          c.t >= ds &&
          c.t < ds + 86400000
      )
    ).length;


  const fmtH =
    m =>
      (m / 60).toFixed(1).replace(/\.0$/, "");


  return {

    deepH: fmtH(deepMin),

    totalH: fmtH(totalMin),

    share:
      totalMin > 0
        ? Math.round(deepMin / totalMin * 100) + "%"
        : "—",

    sessions: sessions,

    nights: nights

  };

}


function deepWeekLines(commits, days) {

  const L = [];

  const glyph =
    ["·", "●", "◆"];

  const rows =
    deepWeekCells(commits, days, 60);


  L.push(
    "DEEP WEEK — 1 char = 1h"
  );


  let axis =
    " ".repeat(7 + 24);

  [[0, "0"], [6, "6"], [12, "12"], [18, "18"]]
    .forEach(([h, s]) => {

      axis =
        axis.substring(0, 7 + h) +
        s +
        axis.substring(7 + h + s.length);

    });

  L.push(axis);


  days.forEach((ds, di) => {

    L.push(
      weekdayShort(ds) +
      " " +
      dayLabel(ds).slice(3) +
      " " +
      rows[di].map(v => glyph[v]).join("")
    );

  });


  L.push(
    "LEGEND ● work · empty ◆ deep"
  );


  const st =
    deepWeekStats(commits, days);


  L.push(
    "DEEP " + st.deepH + "h / " + st.totalH + "h" +
    " (" + st.share + ")" +
    " · " + st.sessions + " sessions" +
    " · " + st.nights + "/7 nights"
  );


  return L;

}


const RULE = "─".repeat(36);


/* =====================================================
   THE REPORT
===================================================== */

function goalDayKey(ms) {

  const d = new Date(ms);


  return (
    d.getFullYear() + "-" +
    pad2(d.getMonth() + 1) + "-" +
    pad2(d.getDate())
  );

}


function goalWeekKey(ms) {

  const d = new Date(ms);

  const day = (d.getDay() + 6) % 7;

  d.setDate(d.getDate() - day + 3);

  const thursday = new Date(d.getTime());

  const first = new Date(thursday.getFullYear(), 0, 4);

  const fday = (first.getDay() + 6) % 7;

  first.setDate(first.getDate() - fday + 3);

  const week =
    1 + Math.round((thursday - first) / 604800000);


  return (
    thursday.getFullYear() + "-W" +
    String(week).padStart(2, "0")
  );

}


function goalMonthKey(ms) {

  const d = new Date(ms);


  return (
    d.getFullYear() + "-" +
    pad2(d.getMonth() + 1)
  );

}


function goalPeriodKey(period, ms) {

  if (period === "week") return goalWeekKey(ms);

  if (period === "month") return goalMonthKey(ms);

  return goalDayKey(ms);

}


/*
   Hit rate for one goal over its window:
   day -> last 7 days, week -> last 4 weeks,
   month -> last 3 months. Only periods with an
   explicit check count; unchecked periods are
   ignored, not punished.
*/
function goalDots(checks, period, nowMs) {

  /*
     Dots answer "which recent periods did I hit?",
     not "what's my rate?". ● = hit that period,
     · = no check recorded (no goal set, missed,
     or forgot — not distinguished, no judgment).
     Rightmost dot = current period. Legacy `false`
     values read as unchecked.
  */
  checks = checks || {};


  const windows = {
    day: 7,
    week: 4,
    month: 3
  };


  const n = windows[period] || 7;

  const prefix = period[0] + ":";


  const keys = [];

  const cursor = new Date(nowMs);


  for (let i = 0; i < n; i++) {

    keys.unshift(
      prefix + goalPeriodKey(period, cursor.getTime())
    );


    if (period === "week") {

      cursor.setDate(cursor.getDate() - 7);

    } else if (period === "month") {

      cursor.setMonth(cursor.getMonth() - 1);

    } else {

      cursor.setDate(cursor.getDate() - 1);

    }

  }


  let dots = "";

  let hits = 0;


  keys.forEach(k => {

    if (checks[k] === true) {

      dots += "\u25cf";

      hits++;

    } else {

      dots += "\u00b7";

    }

  });


  return { dots: dots, hits: hits };

}


function buildGoalsLines(projects, nowMs) {

  const withGoals = projects.filter(
    p =>
      p &&
      !p.cancelled &&
      p.goals &&
      (p.goals.day || p.goals.week || p.goals.month)
  );


  if (!withGoals.length) return [];


  const L = [];


  L.push("GOALS — completion rate");


  ["day", "week", "month"].forEach(period => {

    const rows = [];

    withGoals.forEach(p => {

      const text = ((p.goals || {})[period] || "").trim();

      if (!text) return;


      const key =
        period[0] + ":" + goalPeriodKey(period, nowMs);

      const state = (p.goalChecks || {})[key];

      const mark =
        state === true ? "[x]" : "[ ]";

      const r = goalDots(p.goalChecks, period, nowMs);


      rows.push(
        "  " + mark + " " +
        p.name + " — " +
        text.slice(0, 32) +
        "  " + r.dots + " " + r.hits
      );

    });


    if (!rows.length) return;

    L.push(period.toUpperCase());
    rows.forEach(r => L.push(r));

  });


  return L;

}


function buildReport(projects, nowMs) {

  nowMs = nowMs || Date.now();


  const commits =
    collectCommits(projects, nowMs);


  const L = [];

  const dateStr = fmtDate(nowMs);


  L.push(
    "RITHUB · TIME REPORT" +
    " ".repeat(Math.max(1, 34 - 19 - dateStr.length)) +
    dateStr
  );

  L.push(RULE);


  if (!commits.length) {

    L.push("NO DATA YET — commit something,");

    L.push("then come back for the math.");

    return L.join("\n");

  }


  const todayStart =
    dayStartMs(nowMs);


  const days =
    last7Days(nowMs);


  const dayStats =
    days.map(d => hourlyStats(commits, d));


  /* ---------- numbers strip: today ---------- */

  const tStat = dayStats[6];

  const todayCommits =
    commits.filter(c => c.t >= todayStart);

  const coveredH = countCovered(tStat);

  const bh = blankHoursOf(tStat);

  const estimatedToday =
    todayCommits.some(c => !c.durationMin);

  const stretches = blankStretches(tStat);

  const longest =
    stretches.length
      ? stretches.reduce(
          (a, b) =>
            (b[1] - b[0]) > (a[1] - a[0]) ? b : a
        )
      : null;

  const deepToday =
    deepStartedOn(commits, todayStart);


  const measByProj = {};


  todayCommits.forEach(c => {

    if (c.durationMin) {

      measByProj[c.project] =
        (measByProj[c.project] || 0) +
        c.durationMin;

    }

  });


  const measParts =
    Object.keys(measByProj)
      .sort()
      .map(k => k + " " + measByProj[k] + "m");


  L.push(
    "TODAY  commits " + todayCommits.length +
    " · covered " + coveredH + "h" +
    " · blank " + bh + "h" +
    (estimatedToday ? " ~" : "")
  );

  L.push(
    "       longest blank " +
    (longest ? longest[0] + "–" + longest[1] : "—") +
    " · deep " + (deepToday ? "●" : "○")
  );

  L.push(
    "       measured  " +
    (measParts.length
      ? measParts.join(" · ")
      : "— (no timed commits yet)")
  );


  /* ---------- numbers strip: week ---------- */

  const weekCommits =
    commits.filter(c => c.t >= days[0]);

  const starts =
    days.map(d => deepStartedOn(commits, d));

  const startRate =
    Math.round(
      starts.filter(Boolean).length / 7 * 100
    );

  const strip7 =
    starts.map(s => s ? "●" : "○").join(" ");


  const names = projectNames(projects);

  let hungriest = null, hStreak = -1;


  names.forEach(n => {

    /*
       Capped at the retention window: with
       auto-prune at 7 days, a longer lookback
       would report phantom quiet days.
    */
    const st =
      quietStreak(commits, n, todayStart, 7);


    if (st > hStreak) {

      hStreak = st;

      hungriest = n;

    }

  });


  L.push(
    "WEEK   commits " + weekCommits.length +
    " · deep start " + startRate + "%"
  );

  L.push("       " + strip7);

  L.push(
    "       hungriest  " +
    (hStreak > 0
      ? hungriest + " (" + hStreak + "d quiet)"
      : "—")
  );

  L.push(RULE);


  /* ---------- 1. energy curve ---------- */

  L.push("ENERGY — commits/hour");


  const meanCounts =
    avgArrays(dayStats.map(s => s.counts));

  const meanMeas =
    avgArrays(dayStats.map(s => s.measured));

  const sp7 = sparkline(meanCounts);

  const spT = sparkline(tStat.counts);

  const spM = sparkline(meanMeas);

  const dots24 = "·".repeat(24);


  L.push(" 7d avg " + sp7);

  L.push(" today  " + (spT || dots24));

  L.push(
    " min/hr " +
    (spM || "(no timed commits yet)")
  );

  L.push("        " + hourAxis());


  const peak = peakRanges(meanCounts);


  L.push(
    " dip 13–15 (circadian) · peak " +
    (peak || "—")
  );

  L.push("");


  /* ---------- 3. gap trend ---------- */

  L.push("GAP TREND — 24h bars (wake 08–24 + 8h sleep)");
  L.push("          \u2588 work \u2591 idle \u2500 sleep");


  days.forEach((d, i) => {

    const s = dayStats[i];

    const w = wakeWorkHoursOf(s);

    const idle = (WAKE_END - WAKE_START) - w;

    const dc = commits.filter(
      c => c.t >= d && c.t < d + 86400000
    );

    const est =
      dc.length > 0 &&
      dc.some(c => !c.durationMin);


    L.push(
      dayLabel(d) + " " +
      "\u2588".repeat(w) +
      "\u2591".repeat(idle) +
      " \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" +
      " " + w + "w " + idle + "i" +
      (est ? " ~" : "")
    );

  });

  L.push("");


  /* ---------- 4. project balance ---------- */

  L.push("PROJECTS — commits/day");


  const head =
    "             " +
    days
      .map(d => dayLabel(d).slice(3).padStart(3))
      .join("");


  L.push(head);


  const projCounts = {};


  names.forEach(n => {

    projCounts[n] = days.map(d =>
      commits.filter(
        c =>
          c.project === n &&
          c.t >= d &&
          c.t < d + 86400000
      ).length
    );

  });


  const order =
    names
      .slice()
      .sort((a, b) => {
        const ta = projCounts[a].reduce((x, y) => x + y, 0);
        const tb = projCounts[b].reduce((x, y) => x + y, 0);
        return tb - ta;
      });


  order.forEach(n => {

    const row = projCounts[n];

    const flag =
      maxZeroRun(row) >= 3 ? " !" : "";


    L.push(
      n.slice(0, 13).padEnd(13) +
      row.map(v => String(v).padStart(3)).join("") +
      flag
    );

  });

  L.push(" ! = 3+ days with zero commits");

  L.push("");


  /* ---------- 4b. goals ---------- */

  const goalLines =
    buildGoalsLines(projects, nowMs);

  goalLines.forEach(
    line => L.push(line)
  );

  if (goalLines.length) L.push("");


  /* ---------- 5. deep week grid ---------- */

  deepWeekLines(
    commits,
    days
  ).forEach(line => L.push(line));

  L.push("");

  L.push(
    "rules: 90/20 ultradian · dip 13–15 · " +
    "sleep guard 00:30 · ~ = estimated"
  );


  return L.join("\n");

}


if (
  typeof module !== "undefined" &&
  module.exports
) {

  module.exports = {

    buildReport,

    collectCommits,

    pruneOldCommits,

    hourlyStats,

    sparkline,

    blankHoursOf,

    blankStretches,

    deepStartedOn,

    peakRanges,

    maxZeroRun,

    quietStreak,

    last7Days,

    deepWeekCells,

    deepWeekStats,

    deepWeekLines,

    weekdayShort,

    goalDayKey,

    goalWeekKey,

    goalMonthKey,

    goalPeriodKey,

    goalDots,

    buildGoalsLines,

    timerElapsedMs,

    timerElapsedMin,

    formatElapsed,

    WAKE_START,

    WAKE_END

  };

}
