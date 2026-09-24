/* =====================================================
   PROJECTS MVP

   Everything is stored in localStorage.
   No backend.
   No database.
===================================================== */


const STORAGE_KEY = "projects-mvp";


/* --------------------
   DATA
-------------------- */

let projects = JSON.parse(
  localStorage.getItem(STORAGE_KEY)
) || [

  {
    id: crypto.randomUUID(),

    name: "GAMBIA",

    city: "Dakar",

    focus: true,

    nextSteps: [
      {
        id: crypto.randomUUID(),
        text: "Finish payment flow",
        done: false
      },
      {
        id: crypto.randomUUID(),
        text: "Compare settlement options",
        done: false
      },
      {
        id: crypto.randomUUID(),
        text: "Talk to GG",
        done: false
      }
    ],

    commits: [

      {
        id: crypto.randomUUID(),

        text: "Payment flow v1",

        createdAt: new Date().toISOString()
      }

    ]
  },

  {
    id: crypto.randomUUID(),

    name: "STARTUP",

    city: "New York",

    focus: false,

    nextSteps: [
      {
        id: crypto.randomUUID(),
        text: "Build first interaction",
        done: false
      }
    ],

    commits: []
  },

  {
    id: crypto.randomUUID(),

    name: "PRIVACY",

    city: "Taipei",

    focus: false,

    nextSteps: [
      {
        id: crypto.randomUUID(),
        text: "Read next paper",
        done: false
      }
    ],

    commits: []
  }

];


let currentProjectId = null;


/* --------------------
   SAVE
-------------------- */

function saveData() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(projects)
  );

}


/* --------------------
   HELPERS
-------------------- */

function getProject(id) {

  return projects.find(
    project => project.id === id
  );

}


function getLatestCommit(project) {

  if (!project.commits.length) {
    return null;
  }

  return project.commits[
    project.commits.length - 1
  ];

}


function formatDate(dateString) {

  const date = new Date(dateString);

  const now = new Date();

  const diff =
    (now - date) / 1000;

  if (diff < 60) {
    return "just now";
  }

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }

  if (diff < 604800) {
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric"
    }
  );

}


/* --------------------
   HOME
-------------------- */

function renderHome() {

  document
    .getElementById("homeView")
    .classList.remove("hidden");

  document
    .getElementById("projectView")
    .classList.add("hidden");


  const grid =
    document.getElementById(
      "projectsGrid"
    );

  grid.innerHTML = "";


  projects.forEach(project => {

    const latest =
      getLatestCommit(project);

    const next =
      project.nextSteps.length
        ? project.nextSteps[0].text
        : "Nothing queued";


    const card =
      document.createElement("div");

    card.className =
      "project-card" +
      (project.focus ? " focus" : "");


    card.innerHTML = `

      <div>

        <div class="project-top">

          <div>

            <div class="project-name">
              ${escapeHtml(project.name)}
            </div>

            <div class="project-place">
              ${escapeHtml(project.city)}
            </div>

          </div>

          ${
            project.focus
              ? `<div class="focus-label">FOCUS</div>`
              : ""
          }

        </div>


        <div class="project-info">

          <div class="info-block">

            <div class="info-label">
              NEXT
            </div>

            <div class="info-text">
              ${escapeHtml(next)}
            </div>

          </div>


          <div class="info-block">

            <div class="info-label">
              LATEST
            </div>

            <div class="info-text latest">

              ${
                latest
                  ? escapeHtml(latest.text)
                  : "No commits yet"
              }

            </div>

          </div>

        </div>

      </div>


      <div style="margin-top:30px;">

        <button
          class="small-button open-project"
          data-id="${project.id}"
        >
          Open →
        </button>

        ${
          project.focus
            ? ""
            : `
              <button
                class="small-button focus-project"
                data-id="${project.id}"
              >
                Set focus
              </button>
            `
        }

      </div>

    `;


    grid.appendChild(card);

  });


  attachHomeEvents();

}


/* --------------------
   HOME EVENTS
-------------------- */

function attachHomeEvents() {

  document
    .querySelectorAll(".open-project")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openProject(
            button.dataset.id
          );

        }
      );

    });


  document
    .querySelectorAll(".focus-project")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setFocus(
            button.dataset.id
          );

        }
      );

    });

}


/* --------------------
   FOCUS
-------------------- */

function setFocus(id) {

  projects.forEach(
    project => {
      project.focus =
        project.id === id;
    }
  );

  saveData();

  renderHome();

}


/* --------------------
   PROJECT PAGE
-------------------- */

function openProject(id) {

  currentProjectId = id;

  document
    .getElementById("homeView")
    .classList.add("hidden");

  document
    .getElementById("projectView")
    .classList.remove("hidden");


  renderProject();

}


function renderProject() {

  const project =
    getProject(currentProjectId);

  if (!project) return;


  document
    .getElementById("projectTitle")
    .textContent = project.name;


  document
    .getElementById("projectCity")
    .textContent = project.city;


  renderNextSteps(project);

  renderHistory(project);

}


/* --------------------
   NEXT STEPS
-------------------- */

function renderNextSteps(project) {

  const container =
    document.getElementById(
      "nextSteps"
    );

  container.innerHTML = "";


  project.nextSteps.forEach(
    (step, index) => {

      const row =
        document.createElement("div");

      row.className =
        "next-step";


      row.innerHTML = `

        <div class="next-number">
          ${index + 1}
        </div>

        <div class="next-text">
          ${escapeHtml(step.text)}
        </div>

        <div class="step-actions">

          ${
            index > 0
              ? `
                <button
                  class="move-step-up"
                  data-index="${index}"
                >
                  ↑
                </button>
              `
              : ""
          }

          ${
            index < project.nextSteps.length - 1
              ? `
                <button
                  class="move-step-down"
                  data-index="${index}"
                >
                  ↓
                </button>
              `
              : ""
          }

          <button
            class="delete-step"
            data-id="${step.id}"
          >
            ×
          </button>

        </div>

      `;


      container.appendChild(row);

    }
  );


  attachStepEvents();

}


function attachStepEvents() {

  document
    .querySelectorAll(".move-step-up")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          moveStep(
            Number(button.dataset.index),
            -1
          );

        }
      );

    });


  document
    .querySelectorAll(".move-step-down")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          moveStep(
            Number(button.dataset.index),
            1
          );

        }
      );

    });


  document
    .querySelectorAll(".delete-step")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteStep(
            button.dataset.id
          );

        }
      );

    });

}


/* --------------------
   MOVE STEP
-------------------- */

function moveStep(index, direction) {

  const project =
    getProject(currentProjectId);

  const newIndex =
    index + direction;


  if (
    newIndex < 0 ||
    newIndex >= project.nextSteps.length
  ) {

    return;

  }


  const temp =
    project.nextSteps[index];

  project.nextSteps[index] =
    project.nextSteps[newIndex];

  project.nextSteps[newIndex] =
    temp;


  saveData();

  renderProject();

}


/* --------------------
   DELETE STEP
-------------------- */

function deleteStep(id) {

  const project =
    getProject(currentProjectId);


  project.nextSteps =
    project.nextSteps.filter(
      step => step.id !== id
    );


  saveData();

  renderProject();

}


/* --------------------
   ADD STEP
-------------------- */

document
  .getElementById("addStepBtn")
  .addEventListener(
    "click",
    () => {

      const project =
        getProject(currentProjectId);


      if (
        project.nextSteps.length >= 3
      ) {

        alert(
          "Keep the list to 3 steps max."
        );

        return;

      }


      const text =
        prompt(
          "What's next?"
        );


      if (!text) return;


      project.nextSteps.push({

        id: crypto.randomUUID(),

        text: text,

        done: false

      });


      saveData();

      renderProject();

    }
  );


/* --------------------
   HISTORY
-------------------- */

function renderHistory(project) {

  const container =
    document.getElementById(
      "commitHistory"
    );

  container.innerHTML = "";


  const commits =
    [...project.commits]
      .reverse();


  if (!commits.length) {

    container.innerHTML =
      `<div class="latest">
        No commits yet.
      </div>`;

    return;

  }


  commits.forEach(commit => {

    const row =
      document.createElement("div");

    row.className =
      "commit";


    row.innerHTML = `

      <div class="commit-main">
        ${escapeHtml(commit.text)}
      </div>

      <div class="commit-meta">

        ${escapeHtml(project.city)}
        ·
        ${formatDate(commit.createdAt)}

      </div>

    `;


    container.appendChild(row);

  });

}


/* --------------------
   COMMIT MODAL
-------------------- */

document
  .getElementById("commitBtn")
  .addEventListener(
    "click",
    () => {

      const project =
        getProject(currentProjectId);


      document
        .getElementById("commitInput")
        .value = "";


      renderCommitSteps(
        project
      );


      document
        .getElementById("commitModal")
        .classList.remove("hidden");

    }
  );


function renderCommitSteps(project) {

  const container =
    document.getElementById(
      "commitNextSteps"
    );

  container.innerHTML = "";


  project.nextSteps.forEach(
    (step, index) => {

      const row =
        document.createElement("div");

      row.className =
        "next-step";


      row.innerHTML = `

        <div class="next-number">
          ${index + 1}
        </div>

        <div class="next-text">
          ${escapeHtml(step.text)}
        </div>

      `;


      container.appendChild(row);

    }
  );

}


/* --------------------
   ADD COMMIT STEP
-------------------- */

document
  .getElementById("addCommitStepBtn")
  .addEventListener(
    "click",
    () => {

      const project =
        getProject(currentProjectId);


      if (
        project.nextSteps.length >= 3
      ) {

        alert(
          "Keep the list to 3 steps max."
        );

        return;

      }


      const text =
        prompt(
          "What's next?"
        );


      if (!text) return;


      project.nextSteps.push({

        id: crypto.randomUUID(),

        text: text,

        done: false

      });


      saveData();

      renderCommitSteps(
        project
      );

    }
  );


/* --------------------
   SAVE COMMIT
-------------------- */

document
  .getElementById("saveCommitBtn")
  .addEventListener(
    "click",
    () => {

      const project =
        getProject(currentProjectId);


      const text =
        document
          .getElementById("commitInput")
          .value
          .trim();


      if (!text) {

        alert(
          "Write something first."
        );

        return;

      }


      /* Create commit */

      project.commits.push({

        id: crypto.randomUUID(),

        text: text,

        createdAt:
          new Date().toISOString()

      });


      /*
        The first NEXT item is considered
        the thing you just pushed forward.

        Remove it after committing.
      */

      if (
        project.nextSteps.length
      ) {

        project.nextSteps.shift();

      }


      saveData();


      document
        .getElementById("commitModal")
        .classList.add("hidden");


      renderProject();

    }
  );


/* --------------------
   CLOSE MODALS
-------------------- */

document
  .getElementById("cancelCommitBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("commitModal")
        .classList.add("hidden");

    }
  );


/* --------------------
   NEW PROJECT
-------------------- */

document
  .getElementById("addProjectBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("projectNameInput")
        .value = "";

      document
        .getElementById("projectCityInput")
        .value = "";

      document
        .getElementById("projectModal")
        .classList.remove("hidden");

    }
  );


document
  .getElementById("cancelProjectBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("projectModal")
        .classList.add("hidden");

    }
  );


document
  .getElementById("saveProjectBtn")
  .addEventListener(
    "click",
    () => {

      const name =
        document
          .getElementById("projectNameInput")
          .value
          .trim();


      const city =
        document
          .getElementById("projectCityInput")
          .value
          .trim();


      if (!name) {

        alert(
          "Give the project a name."
        );

        return;

      }


      projects.push({

        id: crypto.randomUUID(),

        name: name,

        city: city || "—",

        focus:
          projects.length === 0,

        nextSteps: [],

        commits: []

      });


      saveData();


      document
        .getElementById("projectModal")
        .classList.add("hidden");


      renderHome();

    }
  );


/* --------------------
   BACK
-------------------- */

document
  .getElementById("backBtn")
  .addEventListener(
    "click",
    () => {

      currentProjectId = null;

      renderHome();

    }
  );


/* --------------------
   ESCAPE HTML
-------------------- */

function escapeHtml(value) {

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


/* --------------------
   START
-------------------- */

renderHome();