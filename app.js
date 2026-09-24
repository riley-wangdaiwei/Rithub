const STORAGE_KEY = "rithub-v2";


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

let projects =
  JSON.parse(
    localStorage.getItem(
      STORAGE_KEY
    )
  );


/*
   First launch
*/

if (!projects) {

  projects = [

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

  ];

  save();

}


/* =====================================================
   STATE
===================================================== */

let currentProjectId =
  null;


/* =====================================================
   STORAGE
===================================================== */

function save() {

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
            LASTEST COMMIT
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


/* =====================================================
   FOCUS
===================================================== */

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


  save();

  renderHome();

}


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


      if (
        project.next.length >= 3
      ) {

        alert(
          "Maximum 3 next commits."
        );

        return;

      }


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

        </div>

      `;


      container.appendChild(
        item
      );

    }

  );

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


      if (
        project.next.length >= 3
      ) {

        alert(
          "Maximum 3 next commits."
        );

        return;

      }


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


      project.commits.push(
        commit
      );


      /*
        First NEXT COMMIT becomes
        the thing that was just pushed.
      */

      if (
        project.next.length
      ) {

        project.next.shift();

      }


      save();


      document
        .getElementById(
          "commitModal"
        )
        .classList.add(
          "hidden"
        );


      renderProject();

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


      const confirmCancel =
        window.confirm(

          `Cancel project "${project.name}"?`

        );


      if (!confirmCancel) {

        return;

      }


      /*
        Don't delete.
        Just archive it as cancelled.
      */

      project.cancelled =
        true;

      project.focus =
        false;


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
   START
===================================================== */

renderHome();