/* Shared film background — loaded by index.html, report.html, gym.html.
   Config (TMDB key + film list) lives in localStorage under
   FILM_BG_KEY. Same origin => shared across the three pages. */


/* =====================================================
   FILM BACKGROUND — daily backdrop from her watched
   films via TMDB. Key stays per-device; film list
   syncs via gist.
   ===================================================== */

const FILM_BG_KEY = "rithub-film-bg-v1";
const FILM_BG_CACHE_KEY = "rithub-film-bg-cache-v1";


function getFilmBgConfig() {

  try {

    return JSON.parse(
      localStorage.getItem(FILM_BG_KEY)
    ) || {};

  } catch (e) {

    return {};

  }

}


function dayOfYear(d) {

  const start = new Date(d.getFullYear(), 0, 0);

  return Math.floor((d - start) / 864e5);

}


async function initFilmBg() {

  const cfg = getFilmBgConfig();

  const key = (cfg.tmdbKey || "").trim();

  const films = (cfg.films || [])
    .map(f => (f || "").trim())
    .filter(Boolean);


  setFilmBgStatus("");


  if (!key || !films.length) {

    return;

  }


  const today = new Date();

  const dateStr =
    today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");


  // one backdrop per day, cached in localStorage

  let cache = {};

  try {

    cache =
      JSON.parse(
        localStorage.getItem(FILM_BG_CACHE_KEY)
      ) || {};

  } catch (e) {}


  if (
    cache.dateStr === dateStr &&
    cache.backdropUrl
  ) {

    applyFilmBg(cache);

    return;

  }


  /*
     Date picks a starting film; if it has no backdrop
     (or TMDB mismatches), walk forward through the
     list until one works. Max 8 tries to stay kind
     to the API.
  */

  const startIdx =
    dayOfYear(today) % films.length;

  const tries =
    Math.min(films.length, 8);


  for (let i = 0; i < tries; i++) {

    const film =
      films[(startIdx + i) % films.length];


    try {

      const entry =
        await fetchFilmBackdrop(key, film);


      if (entry && entry.backdropUrl) {

        entry.dateStr = dateStr;

        localStorage.setItem(
          FILM_BG_CACHE_KEY,
          JSON.stringify(entry)
        );

        applyFilmBg(entry);

        setFilmBgStatus(
          "showing: " + entry.title
        );

        return;

      }

    } catch (e) {

      /* try next film */

    }

  }


  setFilmBgStatus(
    "no backdrop found today — try again tomorrow"
  );

}


async function fetchFilmBackdrop(key, film) {

  const searchRes = await fetch(
    "https://api.themoviedb.org/3/search/movie" +
    "?api_key=" + encodeURIComponent(key) +
    "&query=" + encodeURIComponent(film) +
    "&language=en-US"
  ).then(r => r.json());


  const results = searchRes.results || [];


  /*
     Guard against TMDB fuzzy mismatch
     (e.g. searching "8½" returning "Exit 8"):
     prefer a result whose title actually matches
     the query before falling back to top hit.
  */

  const q = film.toLowerCase();

  const movie =
    results.find(m => {

      const t = (m.title || "").toLowerCase();

      return t.includes(q) || q.includes(t);

    }) || results[0];


  if (!movie) {

    return null;

  }


  const [credits, images] = await Promise.all([

    fetch(
      "https://api.themoviedb.org/3/movie/" +
      movie.id + "/credits" +
      "?api_key=" + encodeURIComponent(key)
    ).then(r => r.json()),

    fetch(
      "https://api.themoviedb.org/3/movie/" +
      movie.id + "/images" +
      "?api_key=" + encodeURIComponent(key)
    ).then(r => r.json())

  ]);


  const director =
    ((credits.crew || []).find(
      p => p.job === "Director"
    ) || {}).name || "";


  const backdrop =
    (images.backdrops || [])[0];


  if (!backdrop) {

    return null;

  }


  return {

    film: film,

    title: movie.title || film,

    year: (movie.release_date || "").slice(0, 4),

    director: director,

    backdropUrl:
      "https://image.tmdb.org/t/p/w1280" +
      backdrop.file_path

  };

}


function setFilmBgStatus(msg) {

  const el =
    document.getElementById("filmBgStatus");

  if (el) {

    el.textContent = msg || "";

  }

}


function applyFilmBg(entry) {

  const bg = document.getElementById("filmBg");

  if (bg && entry.backdropUrl) {

    bg.style.backgroundImage =
      "url(" + entry.backdropUrl + ")";

  }


  const credit = document.getElementById("filmCredit");

  if (credit) {

    const parts = [entry.title || entry.film];

    if (entry.year) {

      parts[0] += " (" + entry.year + ")";

    }

    if (entry.director) {

      parts.push(entry.director);

    }

    credit.textContent = parts.join(" \u00b7 ");

    credit.classList.remove("hidden");

  }

}
