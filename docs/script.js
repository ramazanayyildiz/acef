const routeData = {
  small: {
    title: "Small feature",
    copy:
      "Use a short brief, select a qualified golden neighbor, implement locally, and review. Skip heavy requirements and design unless the route escalates.",
  },
  large: {
    title: "Large feature",
    copy:
      "Clarify requirements, design affected modules, plan the slices, then implement task by task with adapter-grounded review.",
  },
  bug: {
    title: "Bug fix",
    copy:
      "Reproduce the issue, find the root cause, make the smallest local fix, add regression evidence when the project has a test pattern, and review.",
  },
  cases: {
    title: "Test-case extraction",
    copy:
      "Extract product flows from code, UI, or docs. Convert flows into acceptance criteria and structured test cases before automation.",
  },
  auto: {
    title: "Test automation setup",
    copy:
      "Inspect existing tests and CI. If no test pattern exists, create one approved golden test before broad automation.",
  },
  unit: {
    title: "Unit / integration tests",
    copy:
      "Use the project adapter to find framework, command, fixtures, and seams. Do not assume the stack; bootstrap the first pattern if needed.",
  },
};

const buttons = document.querySelectorAll("[data-route]");
const title = document.querySelector("#route-title");
const copy = document.querySelector("#route-copy");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.route;
    const data = routeData[key];
    if (!data) return;

    buttons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    title.textContent = data.title;
    copy.textContent = data.copy;
  });
});

