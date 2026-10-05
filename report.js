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

/*
   Fixed daily template (Riles's framework).
   One char per hour, index = hour of day.
   r=reading s=startup c=courses g=grow W=deep ·=rest
*/
const PLAN_ROW =
  "        rssr·cccgg···WW·";

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
   DEEP WEEK grid — 7 rows x 24 columns, 1 char = 1h.
   Each project gets one letter (first free letter of
   its name); lowercase = normal work, UPPERCASE =
   deep work. Deep cells overwrite normal ones.
*/
function weekdayShort(ms) {

  return (
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      [new Date(ms).getDay()]
  );

}


function projectLetters(names) {

  const used = {};

  const out = {};

  const sorted =
    names.slice().sort();


  sorted.forEach(name => {

    const low =
      String(name).toLowerCase();

    let ch =
      null;


    for (const c of low) {

      if (
        /[a-z0-9]/.test(c) &&
        !used[c]
      ) {

        ch = c;

        break;

      }

    }


    if (!ch) {

      let i = 0;

      while (used["#" + i]) {

        i++;

      }

      ch = "#" + i;

    }


    used[ch] =
      true;

    out[name] =
      ch;

  });


  return out;

}


function deepWeekLines(commits, days, letters) {

  const L = [];

  const grid =
    days.map(() => new Array(24).fill("."));


  /*
    Normal first, deep second so deep wins
    overlapping hours.
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

      const ch =
        letters[c.project] || "?";


      days.forEach((ds, di) => {

        for (let h = 0; h < 24; h++) {

          const hs =
            ds + h * 3600000;

          const he =
            hs + 3600000;


          if (start < he && end > hs) {

            grid[di][h] =
              isDeep
                ? ch.toUpperCase()
                : ch;

          }

        }

      });

    });

  });


  L.push(
    "DEEP WEEK — 1 char = 1h · UPPER = deep work"
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
      grid[di].join("")
    );

  });


  const names =
    Object.keys(letters).sort();

  L.push(
    "LEGEND " +
    names
      .map(n => letters[n] + "=" + n)
      .join("  ")
  );


  const deepMin =
    commits
      .filter(c => c.deep && c.durationMin)
      .reduce((a, c) => a + c.durationMin, 0);

  const deepN =
    commits.filter(c => c.deep).length;

  const deepH =
    (deepMin / 60).toFixed(1).replace(/\.0$/, "");


  L.push(
    "DEEP " + deepH + "h this week · " +
    deepN + " sessions"
  );


  return L;

}


const RULE = "─".repeat(36);


/* =====================================================
   THE REPORT
===================================================== */

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


  const todayStart = dayStartMs(nowMs);

  const days = [];

  for (let i = 6; i >= 0; i--) {

    days.push(todayStart - i * 86400000);

  }


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


  /* ---------- 2. today timeline ---------- */

  L.push("TODAY TIMELINE");

  L.push("        " + hourAxis());

  L.push("plan    " + PLAN_ROW);

  L.push(
    "tick    " +
    Array.from(
      { length: 24 },
      (_, h) => hourCovered(h, tStat) ? "●" : "·"
    ).join("")
  );

  L.push(
    " r=reading s=startup c=courses " +
    "g=grow W=deep ·=rest"
  );

  L.push("");


  /* ---------- 3. gap trend ---------- */

  L.push("GAP TREND — blank hrs/day (wake 08–24)");


  days.forEach((d, i) => {

    const s = dayStats[i];

    const b = blankHoursOf(s);

    const dc = commits.filter(
      c => c.t >= d && c.t < d + 86400000
    );

    const est =
      dc.length > 0 &&
      dc.some(c => !c.durationMin);


    L.push(
      dayLabel(d) + " " +
      (b > 0 ? "█".repeat(b) : "·") +
      " " + b + "h" +
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


  /* ---------- 5. deep-water start rate ---------- */

  L.push("DEEP WATER 21:00–22:30 — started?");

  L.push(strip7 + "   " + startRate + "%");

  L.push("");


  /* ---------- 6. deep week grid ---------- */

  const gridNames =
    names.filter(n =>
      commits.some(c => c.project === n)
    );

  deepWeekLines(
    commits,
    days,
    projectLetters(gridNames)
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

    projectLetters,

    deepWeekLines,

    weekdayShort,

    timerElapsedMs,

    timerElapsedMin,

    formatElapsed,

    PLAN_ROW,

    WAKE_START,

    WAKE_END

  };

}
