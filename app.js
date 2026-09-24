const STORAGE_KEY = "rithub-projects";


/* =====================================================
   RANDOM CITY CODE
===================================================== */

const CITIES = [

  "dakar",
  "tokyo",
  "paris",
  "lagos",
  "oslo",
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
  "marrakesh",
  "athens",
  "helsinki",
  "mexico-city",
  "jakarta",
  "vilnius",
  "tunis",
  "reykjavik",
  "vienna",
  "istanbul",
  "montreal",
  "havana",
  "melbourne",
  "buenos-aires"

];


function generateCommitCode() {

  const first =
    CITIES[
      Math.floor(
        Math.random() * CITIES.length
      )
    ];


  let second;

  do {

    second =
      CITIES[
        Math.floor(
          Math.random() * CITIES.length
        )
      ];

  } while (second === first);


  return `${first}-${second}`;

}


/* =====================================================
   DATA
===================================================== */

let projects =
  JSON.parse(
    localStorage.getItem(STORAGE_KEY)
  ) || [

    {
      id: crypto.randomUUID(),

      name: "GAMBIA",

      focus: true,

      cancelled: false,

      nextSteps: [

        {
          id: crypto.randomUUID(),
          text: "Finish payment flow"
        },

        {
          id: crypto.randomUUID(),
          text: "Compare settlement options"
        },

        {
          id: crypto.randomUUID(),
          text: "Talk to GG"
        }

      ],

      commits: [

        {
          id: crypto.randomUUID(),

          text: "Payment flow v1",

          code: generateCommitCode(),

          createdAt:
            new Date().toISOString()

        }

      ]

    },


    {
      id: crypto.randomUUID(),

      name: "STARTUP",

      focus: false,

      cancelled: false,

      nextSteps: [

        {
          id: crypto.randomUUID(),
          text: "Build first interaction"
        }

      ],

      commits: []

    },


    {
      id: crypto.randomUUID(),

      name: "PRIVACY",

      focus: false,

      cancelled: false,

      nextSteps: [

        {
          id: crypto.randomUUID(),
          text: "Read next paper"
        }

      ],

      commits: []

    }

  ];


let currentProjectId = null;


/* =====================================================
   MIGRATION
===================================================== */

projects.forEach(project => {

  if (project.cancelled === undefined) {

    project.cancelled = false;

  }


  project.commits.forEach(commit => {

    if (!commit.code) {

      commit.code =
        generateCommitCode();

    }

  });

});


saveData();


/* =====================================================
   SAVE
===================================================== */

function saveData() {

  localStorage.setItem(

    STORAGE_KEY,

    JSON.stringify(projects)

  );

}


/* =====================================================
   HELPERS
===================================================== */

function getProject(id) {

  return projects.find(
    project => project.id === id
  );

}


function getActiveProjects() {

  return projects.filter(
    project => !project.cancelled
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

  const date =
    new Date(dateString);

  const now =
    new Date();

  const diff =
    (now - date) / 1000;


  if (diff < 60) {

    return "just now";

  }


  if (diff < 3600) {

    return `${Math.floor(
      diff / 60
    )}m ago`;

  }


  if (diff < 86400) {

    return `${Math.floor(
      diff / 3600
    )}h ago`;

  }


  if (diff < 604800) {

    return `${Math.floor(
      diff / 86400
    )}d ago`;

  }


  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric"
    }
  );

}


function escapeHtml(value) {

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


/* =====================================================
   HOME
===================================================== */

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


  const activeProjects =
    getActiveProjects();


  activeProjects.forEach(
    project => {

      const latest =
        getLatestCommit(project);


      const next =
        project.nextSteps.length
          ? project.nextSteps[0].text
          : "Nothing queued";


      const card =
        document.createElement("article");


      card.className =
        "project-card" +
        (
          project.focus
            ? " focus"
            : ""
        );


      card.innerHTML = `

        <div>

          ${
            project.focus
              ? `
                <div class="focus-label">
                  FOCUS
                </div>
              `
              : ""
          }


          <div class="project-name">

            ${escapeHtml(project.name)}

          </div>


          <div class="commit-info">


            <div class="info-block">

              <div class="info-label">
                NEXT COMMIT
              </div>

              <div class="info-text">

                ${escapeHtml(next)}

              </div>

            </div>


            <div class="info-block">

              <div class="info-label">
                LATEST COMMIT
              </div>

              ${
                latest
                  ? `
                    <div class="info-text">

                      ${escapeHtml(
                        latest.text
                      )}

                    </div>

                    <div class="card-bottom">

                      ${escapeHtml(
                        latest.code
                      )}

                      ·

                      ${formatDate(
                        latest.createdAt
                      )}

                    </div>
                  `
                  : `
                    <div class="info-text commit-placeholder">
                      No commits yet
                    </div>
                  `
              }

            </div>


          </div>

        </div>


        <div>

          <button
            class="text-button open-project"
            data-id="${project.id}"
          >
            Open →
          </button>


          ${
            project.focus
              ? ""
              : `
                <button
                  class="text-button focus-project"
                  data-id="${project.id}"
                  style="margin-left:18px;"
                >
                  Set focus
                </button>
              `
          }

        </div>

      `;


      grid.appendChild(card);

    }
  );


  attachHomeEvents();

}


/* =====================================================
   HOME EVENTS
===================================================== */

function attachHomeEvents() {


  document
    .querySelectorAll(".open-project")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

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
        event => {

          event.stopPropagation();

          setFocus(
            button.dataset.id
          );

        }
      );

    });

}


/* =====================================================
   FOCUS
===================================================== */

function setFocus(id) {

  projects.forEach(project => {

    if (!project.cancelled) {

      project.focus =
        project.id === id;

    }

  });


  saveData();

  renderHome();

}


/* =====================================================
   PROJECT PAGE
===================================================== */

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


  if (!project) {

    renderHome();

    return;

  }


  document
    .getElementById("projectTitle")
    .textContent =
    project.name;


  renderNextSteps(project);

  renderHistory(project);

}


/* =====================================================
   NEXT STEPS
===================================================== */

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
            index <
            project.nextSteps.length - 1
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


/* =====================================================
   MOVE / DELETE
===================================================== */

function moveStep(index, direction) {

  const project =
    getProject(currentProjectId);


  const newIndex =
    index + direction;


  if (
    newIndex < 0 ||
    newIndex >=
      project.nextSteps.length
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


/* =====================================================
   ADD NEXT STEP
===================================================== */

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
          "Keep it to 3 next commits."
        );

        return;

      }


      const text =
        prompt(
          "What's next?"
        );


      if (!text) {

        return;

      }


      project.nextSteps.push({

        id:
          crypto.randomUUID(),

        text:
          text.trim()

      });


      saveData();

      renderProject();

    }
  );


/* =====================================================
   HISTORY
===================================================== */

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
      `
        <div
          class="commit-placeholder"
        >
          No commits yet.
        </div>
      `;

    return;

  }


  commits.forEach(commit => {

    const row =
      document.createElement("div");


    row.className =
      "commit";


    row.innerHTML = `

      <div class="commit-main">

        ${escapeHtml(
          commit.text
        )}

      </div>


      <div class="commit-meta">

        <span class="commit-code">

          ${escapeHtml(
            commit.code
          )}

        </span>


        <span>

          ${formatDate(
            commit.createdAt
          )}

        </span>

      </div>

    `;


    container.appendChild(row);

  });

}


/* =====================================================
   COMMIT MODAL
===================================================== */

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

          ${escapeHtml(
            step.text
          )}

        </div>

      `;


      container.appendChild(row);

    }
  );

}


/* =====================================================
   ADD NEXT STEP FROM COMMIT
===================================================== */

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
          "Keep it to 3 next commits."
        );

        return;

      }


      const text =
        prompt(
          "What's next?"
        );


      if (!text) {

        return;

      }


      project.nextSteps.push({

        id:
          crypto.randomUUID(),

        text:
          text.trim()

      });


      saveData();

      renderCommitSteps(
        project
      );

    }
  );


/* =====================================================
   SAVE COMMIT
===================================================== */

document
  .getElementById("saveCommitBtn")
  .addEventListener(
    "click",
    () => {

      const project =
        getProject(currentProjectId);


      const text =
        document
          .getElementById(
            "commitInput"
          )
          .value
          .trim();


      if (!text) {

        alert(
          "Write something first."
        );

        return;

      }


      project.commits.push({

        id:
          crypto.randomUUID(),

        text:
          text,

        code:
          generateCommitCode(),

        createdAt:
          new Date().toISOString()

      });


      /*
        The first next commit
        becomes the thing you just pushed.
      */

      if (
        project.nextSteps.length
      ) {

        project.nextSteps.shift();

      }


      saveData();


      document
        .getElementById(
          "commitModal"
        )
        .classList.add("hidden");


      renderProject();

    }
  );


/* =====================================================
   CANCEL COMMIT MODAL
===================================================== */

document
  .getElementById("cancelCommitBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "commitModal"
        )
        .classList.add("hidden");

    }
  );


/* =====================================================
   NEW PROJECT
===================================================== */

document
  .getElementById("addProjectBtn")
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
        .classList.remove("hidden");

      setTimeout(() => {

        document
          .getElementById(
            "projectNameInput"
          )
          .focus();

      }, 50);

    }
  );


document
  .getElementById(
    "cancelProjectModalBtn"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "projectModal"
        )
        .classList.add("hidden");

    }
  );


document
  .getElementById(
    "saveProjectBtn"
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


      projects.forEach(project => {

        project.focus = false;

      });


      projects.push({

        id:
          crypto.randomUUID(),

        name:
          name,

        focus:
          true,

        cancelled:
          false,

        nextSteps:
          [],

        commits:
          []

      });


      saveData();


      document
        .getElementById(
          "projectModal"
        )
        .classList.add("hidden");


      renderHome();

    }
  );


/* =====================================================
   CANCEL PROJECT
===================================================== */

document
  .getElementById(
    "cancelProjectBtn"
  )
  .addEventListener(
    "click",
    () => {

      const project =
        getProject(currentProjectId);


      if (!project) {

        return;

      }


      const confirmed =
        confirm(
          `Cancel "${project.name}"?`
        );


      if (!confirmed) {

        return;

      }


      project.cancelled = true;

      project.focus = false;


      /*
        Keep the project in localStorage.
        We are hiding it from active projects,
        not deleting its history.
      */


      const remaining =
        getActiveProjects();


      if (remaining.length) {

        remaining[0].focus = true;

      }


      saveData();


      currentProjectId = null;

      renderHome();

    }
  );


/* =====================================================
   BACK
===================================================== */

document
  .getElementById("backBtn")
  .addEventListener(
    "click",
    () => {

      currentProjectId = null;

      renderHome();

    }
  );


/* =====================================================
   START
===================================================== */

renderHome();