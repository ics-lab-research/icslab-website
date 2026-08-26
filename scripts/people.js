const peopleDirectory = document.querySelector("[data-people-directory]");
const peopleTabs = [...document.querySelectorAll("[data-people-tab]")];
const peopleKicker = document.querySelector("[data-people-kicker]");
const peopleTitle = document.querySelector("[data-people-title]");

const peopleGroups = {
  professors: {
    category: "professor",
    label: "Professors",
    title: "Faculty and key members.",
  },
  phd: {
    category: "phd",
    label: "PhD Researchers",
    title: "Doctoral researchers advancing sensing and AI.",
  },
  "research-assistant": {
    category: "research-assistant",
    label: "Research Assistants",
    title: "Engineers turning research into working systems.",
  },
  students: {
    category: "student",
    label: "Students",
    title: "Students learning through active research.",
  },
  alumni: {
    category: "alumni",
    label: "Alumni",
    title: "Former members of the ICSLab community.",
  },
};

const validEmail = (email) => /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@]+$/.test(email);

const createPersonCard = (member, groupLabel) => {
  const article = document.createElement("article");
  const image = document.createElement("img");
  const body = document.createElement("div");
  const role = document.createElement("p");
  const title = document.createElement("h2");
  const contact = document.createElement("p");

  article.className = "person-card";
  article.id = member.id;
  image.src = member.image;
  image.alt = `Portrait of ${member.displayName}`;
  image.width = 640;
  image.height = 640;
  image.loading = "lazy";
  image.decoding = "async";
  body.className = "person-card-body";
  role.className = "person-card-role";
  role.textContent = member.role || groupLabel;
  title.textContent = member.profileTitle || member.displayName;
  contact.className = "person-card-contact";

  if (validEmail(member.email || "")) {
    const email = document.createElement("a");
    email.href = `mailto:${member.email}`;
    email.textContent = member.email;
    contact.append(email);
  } else {
    contact.textContent = member.email ? `Email as published: ${member.email}` : "Email not listed";
  }

  body.append(title, role, contact);
  if (member.bio) {
    const bio = document.createElement("p");
    bio.className = "person-card-bio";
    bio.textContent = member.bio;
    body.append(bio);
  }
  article.append(image, body);
  return article;
};

const selectedGroup = () => {
  const group = new URL(window.location.href).searchParams.get("group");
  return peopleGroups[group] ? group : "professors";
};

const renderPeople = (members, groupKey, updateHistory = false) => {
  const group = peopleGroups[groupKey];
  const visibleMembers = members.filter(({ category }) => category === group.category);

  peopleTabs.forEach((tab) => {
    if (tab.dataset.peopleTab === groupKey) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  peopleKicker.textContent = group.label;
  peopleTitle.textContent = group.title;
  peopleDirectory.replaceChildren(
    ...visibleMembers.map((member) => createPersonCard(member, group.label)),
  );
  peopleDirectory.removeAttribute("aria-busy");

  if (updateHistory) history.replaceState(null, "", `people.html?group=${groupKey}#directory`);
};

if (peopleDirectory) {
  fetch("data/members.json")
    .then((response) => {
      if (!response.ok) throw new Error(`People request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      renderPeople(data.members, selectedGroup());
      peopleTabs.forEach((tab) => {
        tab.addEventListener("click", (event) => {
          event.preventDefault();
          renderPeople(data.members, tab.dataset.peopleTab, true);
          document.querySelector("#directory")?.scrollIntoView();
        });
      });
    })
    .catch(() => {
      const message = document.createElement("p");
      message.className = "publication-error";
      message.textContent = "People data could not be loaded. Please refresh the page.";
      peopleDirectory.replaceChildren(message);
      peopleDirectory.removeAttribute("aria-busy");
    });
}
