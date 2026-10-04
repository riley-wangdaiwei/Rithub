const STORAGE_KEY = "rithub-v2";


/*
   Rolling retention: commits older than this
   many days are pruned on load (and after a
   cloud pull). Weekly numbers survive via the
   report's COPY WEEK DATA button.
*/
const RETENTION_DAYS = 7;


/* =====================================================
   CITY SYSTEM
   These are just the little places Rithub uses
   to make its goofy commit codes.
===================================================== */

const CITIES = [

  "dakar",
  "oslo",
  "tokyo",
  "lagos",
  "lima",
  "kyoto",
  "accra",
  "seoul",
  "nairobi",
  "tbilisi",
  "delhi",
  "berlin",
  "lisbon",
  "cairo",
  "taipei",
  "athens",
  "helsinki",
  "vienna",
  "istanbul",
  "montreal",
  "havana",
  "jakarta",
  "vilnius",
  "reykjavik",
  "marrakesh",
  "melbourne",
  "quito",
  "naples",
  "tunis",
  "prague"

];


function randomCity() {

  return CITIES[
    Math.floor(
      Math.random() *
      CITIES.length
    )
  ];

}


function generateCommitCode() {

  const city1 =
    randomCity();

  let city2 =
    randomCity();


  while (city2 === city1) {

    city2 =
      randomCity();

  }


  return `${city1}-${city2}`;

}


/* =====================================================
   DATA
===================================================== */

let projects = [];
let localUpdatedAt = null;


/*
   The defaults for a first launch.
*/

function seedProjects() {

  return [

    {
      id:
        crypto.randomUUID(),

      name:
        "GAMBIA",

      focus:
        true,

      cancelled:
        false,

      next:
        [

          {
            id:
              crypto.randomUUID(),

            text:
              "Finish payment flow"

          },

          {
            id:
              crypto.randomUUID(),

            text:
              "Compare settlement options"

          },

          {
            id:
              crypto.randomUUID(),

            text:
              "Talk to GG"

          }

        ],

      commits:
        [

          {
            id:
              crypto.randomUUID(),

            text:
              "Mapped payment flow v1",

            code:
              generateCommitCode(),

            createdAt:
              new Date().toISOString()

          }

        ]

    },


    {
      id:
        crypto.randomUUID(),

      name:
        "STARTUP",

      focus:
        false,

      cancelled:
        false,

      next:
        [

          {
            id:
              crypto.randomUUID(),

            text:
              "Build first interaction"

          }

        ],

      commits:
        []

    },


    {
      id:
        crypto.randomUUID(),

      name:
        "PRIVACY",

      focus:
        false,

      cancelled:
        false,

      next:
        [

          {
            id:
              crypto.randomUUID(),

            text:
              "Read next paper"

          }

        ],

      commits:
        []

    }

  ];;

}


/*
   Load from this browser. Migrates the old
   shape (a bare array) into the envelope
   { updatedAt, projects }.
*/

function loadLocal() {

  let raw = null;


  try {

    raw =
      JSON.parse(
        localStorage.getItem(
          STORAGE_KEY
        )
      );

  } catch (e) {

    raw = null;

  }


  if (Array.isArray(raw)) {

    projects = raw;

  } else if (
    raw &&
    Array.isArray(raw.projects)
  ) {

    projects = raw.projects;
    localUpdatedAt = raw.updatedAt || null;

  } else {

    projects = seedProjects();

  }


  if (!localUpdatedAt) {

    localUpdatedAt =
      new Date().toISOString();

  }


  projects =
    pruneOldCommits(
      projects,
      Date.now(),
      RETENTION_DAYS
    );


  /*
    Migration: drop anything archived under the old
    soft-delete rule. Cancel now means gone, so old
    cancelled shells are removed on next open.
  */
  projects =
    projects.filter(p => !p.cancelled);


  saveLocal();

}


/* =====================================================
   STATE
===================================================== */

let currentProjectId =
  null;


/* =====================================================
   STORAGE (local)
===================================================== */

function saveLocal() {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify({

      updatedAt: localUpdatedAt,

      projects: projects

    })

  );

}


function save() {

  localUpdatedAt =
    new Date().toISOString();

  saveLocal();

  schedulePush();

}


/* =====================================================
   CLOUD SYNC (GitHub Gist)
   The token + gist id live only on this device
   (localStorage) and are never synced.
===================================================== */

const SYNC_CONFIG_KEY = "rithub-cloud";
const SYNC_META_KEY = "rithub-cloud-meta";
const GIST_FILE = "rithub.json";

let pushTimer = null;


function cloudConfig() {

  try {

    return JSON.parse(
      localStorage.getItem(
        SYNC_CONFIG_KEY
      )
    );

  } catch (e) {

    return null;

  }

}


function syncMeta() {

  try {

    return (
      JSON.parse(
        localStorage.getItem(
          SYNC_META_KEY
        )
      ) || {}
    );

  } catch (e) {

    return {};

  }

}


function setSyncMeta(patch) {

  const meta = syncMeta();

  Object.keys(patch).forEach(key => {

    meta[key] = patch[key];

  });

  localStorage.setItem(
    SYNC_META_KEY,
    JSON.stringify(meta)
  );

}


async function ghApi(path, token, options) {

  options = options || {};

  const res =
    await fetch(
      "https://api.github.com" + path,
      {
        method: options.method || "GET",
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body:
          options.body
            ? JSON.stringify(options.body)
            : undefined
      }
    );


  if (!res.ok) {

    let detail = "";

    try {

      const err = await res.json();
      detail = err.message ? " — " + err.message : "";

    } catch (e) {}


    throw new Error(
      "GitHub " + res.status + detail
    );

  }


  if (res.status === 204) return null;

  return res.json();

}


function envelope() {

  return {

    updatedAt: localUpdatedAt,

    projects: projects

  };

}


async function fetchRemoteEnvelope(cfg) {

  const gist =
    await ghApi(
      "/gists/" + cfg.gistId,
      cfg.token
    );

  const file =
    gist.files &&
    gist.files[GIST_FILE];


  if (
    !file ||
    !file.content
  ) {

    return null;

  }


  try {

    const data =
      JSON.parse(file.content);


    if (
      data &&
      Array.isArray(data.projects)
    ) {

      return data;

    }

  } catch (e) {}


  return null;

}


function adoptRemote(remote) {

  const beforeCount =
    (remote.projects || [])
      .reduce(
        (n, p) => n + (p.commits || []).length,
        0
      );


  projects =
    pruneOldCommits(
      remote.projects,
      Date.now(),
      RETENTION_DAYS
    );


  /* Drop shells archived under the old soft-delete rule. */
  projects =
    projects.filter(p => !p.cancelled);


  const afterCount =
    projects
      .reduce(
        (n, p) => n + (p.commits || []).length,
        0
      );


  /*
     If pruning removed anything, the pruned
     state is newer than the cloud copy: bump
     the timestamp so the next sync pushes it
     instead of sitting on stale cloud data.
  */
  localUpdatedAt =
    afterCount < beforeCount
      ? new Date().toISOString()
      : remote.updatedAt;

  saveLocal();

  setSyncMeta({
    lastSyncAt: remote.updatedAt
  });

  renderCurrent();

}


async function pushEnvelope(cfg) {

  const meta = syncMeta();

  const remote =
    await fetchRemoteEnvelope(cfg);


  /*
     Guarded push: if the cloud copy moved on
     from another device since we last synced,
     take it instead of overwriting it.
  */

  if (
    remote &&
    remote.updatedAt &&
    localUpdatedAt &&
    remote.updatedAt > localUpdatedAt &&
    (
      !meta.lastSyncAt ||
      remote.updatedAt > meta.lastSyncAt
    )
  ) {

    adoptRemote(remote);

    return "pulled";

  }


  await ghApi(
    "/gists/" + cfg.gistId,
    cfg.token,
    {
      method: "PATCH",
      body: {
        files: {
          [GIST_FILE]: {
            content:
              JSON.stringify(
                envelope()
              )
          }
        }
      }
    }
  );


  setSyncMeta({
    lastSyncAt: localUpdatedAt
  });

  return "pushed";

}


async function syncNow() {

  const cfg = cloudConfig();


  if (!cfg) {

    throw new Error(
      "sync not configured"
    );

  }


  const remote =
    await fetchRemoteEnvelope(cfg);


  if (!remote) {

    /*
       Empty cloud: this device wins.
    */

    await pushEnvelope(cfg);

    return "pushed";

  }


  if (
    remote.updatedAt &&
    (
      !localUpdatedAt ||
      remote.updatedAt > localUpdatedAt
    )
  ) {

    adoptRemote(remote);

    return "pulled";

  }


  if (
    localUpdatedAt &&
    remote.updatedAt &&
    localUpdatedAt > remote.updatedAt
  ) {

    await pushEnvelope(cfg);

    return "pushed";

  }


  return "up to date";

}


function schedulePush() {

  if (!cloudConfig()) return;

  clearTimeout(pushTimer);

  setSyncStatus("syncing…");

  pushTimer = setTimeout(

    async () => {

      try {

        const result =
          await pushEnvelope(
            cloudConfig()
          );


        setSyncStatus(
          result === "pulled"
            ? "pulled newer cloud copy"
            : "synced " +
              relativeTime(
                new Date().toISOString()
              )
        );

      } catch (e) {

        setSyncStatus(
          "sync failed: " + e.message
        );

      }

    },

    2000

  );

}


/* =====================================================
   SYNC UI
===================================================== */

function setSyncStatus(text) {

  const el =
    document.getElementById(
      "syncStatus"
    );


  if (el) {

    el.textContent = text;

  }

}


function renderCurrent() {

  if (
    currentProjectId &&
    getProject(currentProjectId)
  ) {

    renderProject();

  } else {

    currentProjectId = null;

    renderHome();

  }

}


function refreshSyncModal(preserveStatus) {

  const cfg = cloudConfig();
  const meta = syncMeta();


  document.getElementById(
    "syncTokenInput"
  ).value = cfg ? cfg.token : "";

  document.getElementById(
    "syncGistInput"
  ).value = cfg ? cfg.gistId : "";


  document
    .getElementById(
      "disableSyncButton"
    )
    .classList.toggle(
      "hidden",
      !cfg
    );

  document
    .getElementById(
      "syncNowButton"
    )
    .classList.toggle(
      "hidden",
      !cfg
    );

  document.getElementById(
    "enableSyncButton"
  ).textContent = cfg ? "RECONNECT" : "ENABLE";


  if (preserveStatus) return;


  if (!cfg) {

    setSyncStatus("not configured");

  } else if (meta.lastSyncAt) {

    setSyncStatus(
      "synced " +
        relativeTime(meta.lastSyncAt)
    );

  } else {

    setSyncStatus(
      "configured — not synced yet"
    );

  }

}


function wireSyncUI() {

  document
    .getElementById("syncButton")
    .addEventListener(

      "click",

      () => {

        refreshSyncModal(false);

        document
          .getElementById("syncModal")
          .classList.remove("hidden");

      }

    );


  document
    .getElementById("closeSyncModal")
    .addEventListener(

      "click",

      () => {

        document
          .getElementById("syncModal")
          .classList.add("hidden");

      }

    );


  document
    .getElementById("syncModal")
    .addEventListener(

      "click",

      event => {

        if (
          event.target.id === "syncModal"
        ) {

          event.currentTarget.classList.add(
            "hidden"
          );

        }

      }

    );


  document
    .getElementById("enableSyncButton")
    .addEventListener(

      "click",

      async () => {

        const token =
          document
            .getElementById(
              "syncTokenInput"
            )
            .value.trim();

        const gistId =
          document
            .getElementById(
              "syncGistInput"
            )
            .value.trim();


        if (!token) {

          setSyncStatus(
            "paste a github token first"
          );

          return;

        }


        setSyncStatus("connecting…");


        try {

          let id = gistId;


          if (!id) {

            /*
               First device: create the private
               gist from this device's data.
            */

            const gist = await ghApi(
              "/gists",
              token,
              {
                method: "POST",
                body: {
                  description: "Rithub data",
                  public: false,
                  files: {
                    [GIST_FILE]: {
                      content:
                        JSON.stringify(
                          envelope()
                        )
                    }
                  }
                }
              }
            );

            id = gist.id;

          }


          const cfg = {
            gistId: id,
            token: token
          };

          localStorage.setItem(
            SYNC_CONFIG_KEY,
            JSON.stringify(cfg)
          );


          if (gistId) {

            /*
               Joining an existing cloud:
               the cloud copy wins.
            */

            const remote =
              await fetchRemoteEnvelope(cfg);


            if (remote) {

              adoptRemote(remote);

              setSyncStatus(
                "connected — pulled cloud copy"
              );

            } else {

              await pushEnvelope(cfg);

              setSyncStatus(
                "connected — pushed this device"
              );

            }

          } else {

            setSyncMeta({
              lastSyncAt: localUpdatedAt
            });

            setSyncStatus(
              "connected — synced"
            );

          }

        } catch (e) {

          setSyncStatus(
            "failed: " + e.message
          );

        }


        refreshSyncModal(true);

      }

    );


  document
    .getElementById("syncNowButton")
    .addEventListener(

      "click",

      async () => {

        setSyncStatus("syncing…");


        try {

          const result = await syncNow();

          setSyncStatus(
            result === "up to date"
              ? "already up to date"
              : result === "pulled"
                ? "pulled cloud copy"
                : "pushed to cloud"
          );

        } catch (e) {

          setSyncStatus(
            "failed: " + e.message
          );

        }

      }

    );


  document
    .getElementById("disableSyncButton")
    .addEventListener(

      "click",

      () => {

        localStorage.removeItem(
          SYNC_CONFIG_KEY
        );

        localStorage.removeItem(
          SYNC_META_KEY
        );

        refreshSyncModal(false);

      }

    );


  /*
     Pull when the tab becomes visible again,
     so the other device's edits show up.
  */

  document.addEventListener(

    "visibilitychange",

    () => {

      if (
        !document.hidden &&
        cloudConfig()
      ) {

        syncNow().catch(() => {});

      }

    }

  );

}


/* =====================================================
   HELPERS
===================================================== */

function getProject(id) {

  return projects.find(

    project =>
      project.id === id

  );

}


function activeProjects() {

  return projects.filter(

    project =>
      !project.cancelled

  );

}


function latestCommit(project) {

  if (
    !project.commits.length
  ) {

    return null;

  }


  return project.commits[
    project.commits.length - 1
  ];

}


function relativeTime(dateString) {

  const date =
    new Date(dateString);

  const now =
    new Date();

  const seconds =
    (
      now - date
    ) / 1000;


  if (seconds < 60) {

    return "just now";

  }


  if (seconds < 3600) {

    return (
      Math.floor(
        seconds / 60
      )
      + "m ago"
    );

  }


  if (seconds < 86400) {

    return (
      Math.floor(
        seconds / 3600
      )
      + "h ago"
    );

  }


  if (seconds < 604800) {

    return (
      Math.floor(
        seconds / 86400
      )
      + "d ago"
    );

  }


  return date.toLocaleDateString(

    undefined,

    {
      month:
        "short",

      day:
        "numeric"

    }

  );

}


function escapeHtml(value) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* =====================================================
   HOME
===================================================== */

function renderHome() {

  document
    .getElementById(
      "homeView"
    )
    .classList.remove(
      "hidden"
    );


  document
    .getElementById(
      "projectView"
    )
    .classList.add(
      "hidden"
    );


  const container =
    document.getElementById(
      "projectsList"
    );


  container.innerHTML = "";


  const projectsToShow =
    activeProjects();


  projectsToShow.forEach(

    project => {

      const latest =
        latestCommit(
          project
        );


      const nextCommit =

        project.next.length
          ? project.next[0].text
          : "—";


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "project-row" +
        (
          project.focus
            ? " focus"
            : ""
        );


      row.innerHTML = `

        <div>

          <div
            class="project-name"
            data-id="${project.id}"
          >

            ${escapeHtml(
              project.name
            )}

          </div>


          ${
            project.focus
              ? `
                <div class="focus-mark">
                  CURRENT
                </div>
              `
              : ""
          }

        </div>


        <div>

          <div class="row-label">
            NEXT COMMIT
          </div>

          <div class="row-content">

            ${escapeHtml(
              nextCommit
            )}

          </div>

        </div>


        <div>

          <div class="row-label">
            LATEST COMMIT
          </div>


          ${
            latest

              ? `

                <div class="row-content">

                  ${escapeHtml(
                    latest.text
                  )}

                </div>


                <div class="row-meta">

                  <span class="commit-code">

                    ${escapeHtml(
                      latest.code
                    )}

                  </span>

                  ·

                  ${relativeTime(
                    latest.createdAt
                  )}

                </div>

              `

              : `

                <div class="row-content">

                  —

                </div>

              `
          }

        </div>


        <div class="row-actions">

          <button
            class="plain-button open-project"
            data-id="${project.id}"
          >

            OPEN

          </button>


          ${
            project.focus
              ? ""
              : `
                <button
                  class="plain-button focus-project"
                  data-id="${project.id}"
                >
                  FOCUS
                </button>
              `
          }

        </div>

      `;


      container.appendChild(
        row
      );

    }

  );


  attachHomeEvents();


  refreshTimerUI();

}


/* =====================================================
   HOME EVENTS
===================================================== */

function attachHomeEvents() {


  document
    .querySelectorAll(
      ".project-name"
    )
    .forEach(
      element => {

        element.addEventListener(

          "click",

          () => {

            openProject(
              element.dataset.id
            );

          }

        );

      }
    );


  document
    .querySelectorAll(
      ".open-project"
    )
    .forEach(
      button => {

        button.addEventListener(

          "click",

          () => {

            openProject(
              button.dataset.id
            );

          }

        );

      }
    );


  document
    .querySelectorAll(
      ".focus-project"
    )
    .forEach(
      button => {

        button.addEventListener(

          "click",

          () => {

            setFocus(
              button.dataset.id
            );

          }

        );

      }
    );

}

function setFocus(id) {

  projects.forEach(

    project => {

      if (
        !project.cancelled
      ) {

        project.focus =
          (
            project.id === id
          );

      }

    }

  );


  /*
    Move the focused project to the top
    of the homepage list.
  */

  const focusIndex =
    projects.findIndex(
      project =>
        project.id === id
    );


  if (focusIndex > 0) {

    const [focused] =
      projects.splice(
        focusIndex, 1
      );

    projects.unshift(focused);

  }


  save();

  renderHome();

}
/* =====================================================
   FOCUS
===================================================== */


/* =====================================================
   OPEN PROJECT
===================================================== */

function openProject(id) {

  currentProjectId =
    id;


  document
    .getElementById(
      "homeView"
    )
    .classList.add(
      "hidden"
    );


  document
    .getElementById(
      "projectView"
    )
    .classList.remove(
      "hidden"
    );


  renderProject();

}


/* =====================================================
   PROJECT PAGE
===================================================== */

function renderProject() {

  const project =
    getProject(
      currentProjectId
    );


  if (!project) {

    renderHome();

    return;

  }


  document
    .getElementById(
      "projectTitle"
    )
    .textContent =
      project.name;


  renderNext(
    project
  );


  renderHistory(
    project
  );


  refreshTimerUI();

}


/* =====================================================
   NEXT
===================================================== */

function renderNext(project) {

  const container =
    document.getElementById(
      "nextCommitList"
    );


  container.innerHTML = "";


  project.next.forEach(

    (item, index) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "next-item";


      row.innerHTML = `

        <div class="next-number">

          ${index + 1}

        </div>


        <div class="next-text">

          ${escapeHtml(
            item.text
          )}

        </div>


        <div class="next-actions">

          ${
            index > 0
              ? `
                <button
                  class="move-up"
                  data-index="${index}"
                >
                  ↑
                </button>
              `
              : ""
          }


          ${
            index <
            project.next.length - 1
              ? `
                <button
                  class="move-down"
                  data-index="${index}"
                >
                  ↓
                </button>
              `
              : ""
          }


          <button
            class="commit-next-item"
            data-id="${item.id}"
            title="Commit this item"
          >
            ✓
          </button>

          <button
            class="delete-next"
            data-id="${item.id}"
          >
            ×
          </button>

        </div>

      `;


      container.appendChild(
        row
      );

    }

  );


  document
    .querySelectorAll(
      ".move-up"
    )
    .forEach(

      button => {

        button.addEventListener(

          "click",

          () => {

            moveNext(

              Number(
                button.dataset.index
              ),

              -1

            );

          }

        );

      }

    );


  document
    .querySelectorAll(
      ".move-down"
    )
    .forEach(

      button => {

        button.addEventListener(

          "click",

          () => {

            moveNext(

              Number(
                button.dataset.index
              ),

              1

            );

          }

        );

      }

    );


  document
    .querySelectorAll(
      ".delete-next"
    )
    .forEach(

      button => {

        button.addEventListener(

          "click",

          () => {

            deleteNext(
              button.dataset.id
            );

          }

        );

      }

    );


  document
    .querySelectorAll(".commit-next-item")
    .forEach(button => {
      button.addEventListener("click", () => {
        commitNextItem(button.dataset.id);
      });
    });

}


/* =====================================================
   COMMIT ONE NEXT ITEM
===================================================== */

function commitNextItem(id) {
  const project = getProject(currentProjectId);

  if (!project) return;

  const index = project.next.findIndex(
    item => item.id === id
  );

  if (index === -1) return;

  const item = project.next[index];

  project.commits.push({
    id: crypto.randomUUID(),
    text: item.text,
    code: generateCommitCode(),
    createdAt: new Date().toISOString()
  });

  // Remove only the selected item.
  project.next.splice(index, 1);

  save();
  renderProject();
  promptForNextCommit(project);
}


function moveNext(index, direction) {

  const project =
    getProject(
      currentProjectId
    );


  const target =
    index + direction;


  if (
    target < 0 ||
    target >=
      project.next.length
  ) {

    return;

  }


  const temp =
    project.next[index];


  project.next[index] =
    project.next[target];


  project.next[target] =
    temp;


  save();

  renderProject();

}


function deleteNext(id) {

  const project =
    getProject(
      currentProjectId
    );


  project.next =
    project.next.filter(

      item =>
        item.id !== id

    );


  save();

  renderProject();

}


/* =====================================================
   ADD NEXT
===================================================== */

function promptForNextCommit(project) {
  const text = prompt("next commit");

  if (!text || !text.trim()) return;

  project.next.push({
    id: crypto.randomUUID(),
    text: text.trim()
  });

  save();
  renderProject();
}

document
  .getElementById(
    "addNextButton"
  )
  .addEventListener(

    "click",

    () => {

      const project =
        getProject(
          currentProjectId
        );


      const text =
        prompt(
          "next commit"
        );


      if (!text) {

        return;

      }


      project.next.push({

        id:
          crypto.randomUUID(),

        text:
          text.trim()

      });


      save();

      renderProject();

    }

  );


/* =====================================================
   HISTORY
===================================================== */

function renderHistory(project) {

  const container =
    document.getElementById(
      "historyList"
    );


  container.innerHTML = "";


  const commits =
    [...project.commits].reverse();


  if (!commits.length) {

    container.innerHTML = `

      <div
        class="history-item"
        style="color:#888;"
      >
        NO COMMITS YET.
      </div>

    `;

    return;

  }


  commits.forEach(

    commit => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "history-item";


      item.innerHTML = `

        <div class="history-text">

          ${escapeHtml(
            commit.text
          )}

        </div>


        <div class="history-meta">

          <span class="commit-code">

            ${escapeHtml(
              commit.code
            )}

          </span>


          <span>

            ${relativeTime(
              commit.createdAt
            )}

          </span>


          ${

            commit.durationMin != null &&
            commit.durationMin > 0

              ? `

                <span>

                  · ${commit.durationMin} MIN

                </span>

              `

              : ""

          }

        </div>

        <button
          class="history-delete"
          data-id="${commit.id}"
          title="Delete this history"
        >
          ×
        </button>

      `;


      container.appendChild(
        item
      );

    }

  );


  document
    .querySelectorAll(".history-delete")
    .forEach(button => {
      button.addEventListener("click", () => {
        deleteHistoryCommit(button.dataset.id);
      });
    });

}


/* =====================================================
   DELETE HISTORY COMMIT
===================================================== */

function deleteHistoryCommit(id) {
  const project = getProject(currentProjectId);

  if (!project) return;

  const confirmed = confirm(
    "Delete this history record?"
  );

  if (!confirmed) return;

  project.commits = project.commits.filter(
    commit => commit.id !== id
  );

  save();
  renderProject();
}


/* =====================================================
   COMMIT MODAL
===================================================== */

document
  .getElementById(
    "commitButton"
  )
  .addEventListener(

    "click",

    () => {

      const project =
        getProject(
          currentProjectId
        );


      document
        .getElementById(
          "commitInput"
        )
        .value = "";


      renderCommitNext(
        project
      );


      refreshTimerNote();


      document
        .getElementById(
          "commitModal"
        )
        .classList.remove(
          "hidden"
        );

    }

  );


function renderCommitNext(project) {

  const container =
    document.getElementById(
      "commitNextList"
    );


  container.innerHTML = "";


  project.next.forEach(

    (item, index) => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "next-item";


      row.innerHTML = `

        <div class="next-number">

          ${index + 1}

        </div>


        <div class="next-text">

          ${escapeHtml(
            item.text
          )}

        </div>

      `;


      container.appendChild(
        row
      );

    }

  );

}


/* =====================================================
   ADD NEXT FROM COMMIT
===================================================== */

document
  .getElementById(
    "addCommitNextButton"
  )
  .addEventListener(

    "click",

    () => {

      const project =
        getProject(
          currentProjectId
        );


      const text =
        prompt(
          "next commit"
        );


      if (!text) {

        return;

      }


      project.next.push({

        id:
          crypto.randomUUID(),

        text:
          text.trim()

      });


      save();

      renderCommitNext(
        project
      );

    }

  );


/* =====================================================
   SAVE COMMIT
===================================================== */

document
  .getElementById(
    "saveCommitButton"
  )
  .addEventListener(

    "click",

    () => {

      const project =
        getProject(
          currentProjectId
        );


      const input =
        document.getElementById(
          "commitInput"
        );


      const text =
        input.value.trim();


      if (!text) {

        return;

      }


      /*
        Create ONE permanent commit code.
      */

      const commit = {

        id:
          crypto.randomUUID(),

        text:
          text,

        code:
          generateCommitCode(),

        createdAt:
          new Date().toISOString()

      };


      /*
        Timed commits carry their measured minutes.
        Old commits without the field are untouched.
      */

      if (
        pendingDurationMin != null &&
        pendingDurationMin > 0
      ) {

        commit.durationMin =
          pendingDurationMin;

      }


      project.commits.push(
        commit
      );


      save();


      pendingDurationMin = null;

      refreshTimerNote();


      document
        .getElementById(
          "commitModal"
        )
        .classList.add(
          "hidden"
        );


      renderProject();
      promptForNextCommit(project);

    }

  );


/* =====================================================
   CLOSE COMMIT
===================================================== */

document
  .getElementById(
    "closeCommitModal"
  )
  .addEventListener(

    "click",

    () => {

      document
        .getElementById(
          "commitModal"
        )
        .classList.add(
          "hidden"
        );

    }

  );


/* =====================================================
   NEW PROJECT
===================================================== */

document
  .getElementById(
    "newProjectBtn"
  )
  .addEventListener(

    "click",

    () => {

      document
        .getElementById(
          "projectNameInput"
        )
        .value = "";


      document
        .getElementById(
          "projectModal"
        )
        .classList.remove(
          "hidden"
        );


      setTimeout(

        () => {

          document
            .getElementById(
              "projectNameInput"
            )
            .focus();

        },

        50

      );

    }

  );


/* =====================================================
   CLOSE PROJECT MODAL
===================================================== */

document
  .getElementById(
    "closeProjectModal"
  )
  .addEventListener(

    "click",

    () => {

      document
        .getElementById(
          "projectModal"
        )
        .classList.add(
          "hidden"
        );

    }

  );


/* =====================================================
   CREATE PROJECT
===================================================== */

document
  .getElementById(
    "createProjectButton"
  )
  .addEventListener(

    "click",

    () => {

      const name =
        document
          .getElementById(
            "projectNameInput"
          )
          .value
          .trim();


      if (!name) {

        return;

      }


      /*
        New project becomes focus.
      */

      projects.forEach(

        project => {

          if (
            !project.cancelled
          ) {

            project.focus =
              false;

          }

        }

      );


      projects.push({

        id:
          crypto.randomUUID(),

        name:
          name,

        focus:
          true,

        cancelled:
          false,

        next:
          [],

        commits:
          []

      });


      save();


      document
        .getElementById(
          "projectModal"
        )
        .classList.add(
          "hidden"
        );


      renderHome();

    }

  );


/* =====================================================
   CANCEL PROJECT
===================================================== */

document
  .getElementById(
    "cancelProjectButton"
  )
  .addEventListener(

    "click",

    () => {

      const project =
        getProject(
          currentProjectId
        );


      if (!project) {

        return;

      }


      const confirmDelete =
        window.confirm(

          `Delete project "${project.name}"?\n` +
          `This removes it and all its commits permanently.`

        );


      if (!confirmDelete) {

        return;

      }


      /*
        Hard delete. Riles's rule: cancel means gone.
        No trash bin, no archive shell.
      */

      const delIdx =
        projects.findIndex(
          p => p.id === currentProjectId
        );


      if (delIdx >= 0) {

        projects.splice(delIdx, 1);

      }


      /*
        Give focus to the first
        remaining active project.
      */

      const remaining =
        activeProjects();


      if (remaining.length) {

        remaining[0].focus =
          true;

      }


      save();


      currentProjectId =
        null;


      renderHome();

    }

  );


/* =====================================================
   BACK
===================================================== */

document
  .getElementById(
    "backButton"
  )
  .addEventListener(

    "click",

    () => {

      currentProjectId =
        null;

      renderHome();

    }

  );


/* =====================================================
   CLOSE MODALS BY CLICKING OUTSIDE
===================================================== */

document
  .getElementById(
    "projectModal"
  )
  .addEventListener(

    "click",

    event => {

      if (
        event.target.id ===
        "projectModal"
      ) {

        event.currentTarget
          .classList.add(
            "hidden"
          );

      }

    }

  );


document
  .getElementById(
    "commitModal"
  )
  .addEventListener(

    "click",

    event => {

      if (
        event.target.id ===
        "commitModal"
      ) {

        event.currentTarget
          .classList.add(
            "hidden"
          );

      }

    }

  );


/* =====================================================
   TIMER
   One global timer. Stopping it opens the commit
   modal with the measured minutes pre-attached,
   so the saved commit carries durationMin.
   Survives reloads via localStorage.
===================================================== */

const TIMER_KEY =
  "rithub-timer-v1";


let activeTimer =
  null;

let pendingDurationMin =
  null;

let timerTickId =
  null;


function loadTimer() {

  try {

    const raw =
      JSON.parse(
        localStorage.getItem(
          TIMER_KEY
        )
      );


    if (

      raw &&

      typeof raw.projectId ===
        "string" &&

      typeof raw.startedAt ===
        "string" &&

      !isNaN(
        Date.parse(
          raw.startedAt
        )
      )

    ) {

      activeTimer =
        raw;

    }

  } catch (e) {

    activeTimer =
      null;

  }

}


function persistTimer() {

  if (activeTimer) {

    localStorage.setItem(

      TIMER_KEY,

      JSON.stringify(
        activeTimer
      )

    );

  } else {

    localStorage.removeItem(
      TIMER_KEY
    );

  }

}

/*
   Pure time helpers (timerElapsedMs, timerElapsedMin,
   formatElapsed) live in report.js, which index.html
   loads before this file.
*/

function refreshTimerUI() {

  const button =
    document.getElementById(
      "timerButton"
    );


  const badge =
    document.getElementById(
      "timerBadge"
    );


  if (!button || !badge) {

    return;

  }


  const nowMs =
    Date.now();


  if (
    activeTimer &&
    activeTimer.projectId ===
      currentProjectId
  ) {

    button.textContent =
      "STOP " +
      formatElapsed(
        timerElapsedMs(
          activeTimer.startedAt,
          nowMs
        )
      );

    button.disabled =
      false;

    button.classList.add(
      "running"
    );

  } else if (activeTimer) {

    button.textContent =
      "TIMER BUSY";

    button.disabled =
      true;

    button.classList.remove(
      "running"
    );

  } else {

    button.textContent =
      "START TIMER";

    button.disabled =
      false;

    button.classList.remove(
      "running"
    );

  }


  if (activeTimer) {

    const project =
      getProject(
        activeTimer.projectId
      );


    badge.textContent =
      "⏱ " +
      formatElapsed(
        timerElapsedMs(
          activeTimer.startedAt,
          nowMs
        )
      ) +
      (
        project
          ? " · " + project.name
          : ""
      );

    badge.classList.remove(
      "hidden"
    );

  } else {

    badge.classList.add(
      "hidden"
    );

  }

}


function tickTimer() {

  if (timerTickId) {

    clearInterval(
      timerTickId
    );

  }


  timerTickId =
    setInterval(

      () => {

        if (activeTimer) {

          refreshTimerUI();

        }

      },

      1000

    );

}


function startTimer(
  projectId
) {

  if (activeTimer) {

    return;

  }


  activeTimer = {

    projectId:
      projectId,

    startedAt:
      new Date().toISOString()

  };


  persistTimer();

  refreshTimerUI();

}


function stopTimerForCommit() {

  if (!activeTimer) {

    return;

  }


  pendingDurationMin =
    timerElapsedMin(
      activeTimer.startedAt,
      Date.now()
    );


  activeTimer =
    null;

  persistTimer();

  refreshTimerUI();

  refreshTimerNote();


  document
    .getElementById(
      "commitInput"
    )
    .value = "";


  const project =
    getProject(
      currentProjectId
    );


  if (project) {

    renderCommitNext(
      project
    );

  }


  document
    .getElementById(
      "commitModal"
    )
    .classList.remove(
      "hidden"
    );

}


function refreshTimerNote() {

  const note =
    document.getElementById(
      "commitTimerNote"
    );


  const text =
    document.getElementById(
      "commitTimerNoteText"
    );


  if (!note || !text) {

    return;

  }


  if (
    pendingDurationMin != null &&
    pendingDurationMin > 0
  ) {

    text.textContent =
      "⏱ " +
      pendingDurationMin +
      " MIN WILL BE ATTACHED";

    note.classList.remove(
      "hidden"
    );

  } else {

    note.classList.add(
      "hidden"
    );

  }

}


document
  .getElementById(
    "timerButton"
  )
  .addEventListener(

    "click",

    () => {

      if (
        activeTimer &&
        activeTimer.projectId ===
          currentProjectId
      ) {

        stopTimerForCommit();

      } else if (!activeTimer) {

        const project =
          getProject(
            currentProjectId
          );


        if (project) {

          startTimer(
            project.id
          );

        }

      }

    }

  );


document
  .getElementById(
    "timerBadge"
  )
  .addEventListener(

    "click",

    () => {

      if (!activeTimer) {

        return;

      }


      const project =
        getProject(
          activeTimer.projectId
        );


      if (project) {

        openProject(
          project.id
        );

      } else {

        /*
           The project is gone — drop the
           orphan timer instead of breaking.
        */

        activeTimer =
          null;

        persistTimer();

        refreshTimerUI();

      }

    }

  );


document
  .getElementById(
    "commitTimerDiscard"
  )
  .addEventListener(

    "click",

    () => {

      pendingDurationMin =
        null;

      refreshTimerNote();

    }

  );


/* =====================================================
   START
===================================================== */

loadLocal();

loadTimer();

renderHome();

tickTimer();

wireSyncUI();


/*
   Pull the cloud copy in the background
   when sync is configured on this device.
*/

if (cloudConfig()) {

  syncNow().catch(() => {});

}
