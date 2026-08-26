const recentPublications = document.querySelector("[data-publications-recent]");
const publicationArchive = document.querySelector("[data-publications-all]");
const publicationCount = document.querySelector("[data-publication-count]");
const publicationRetrieved = document.querySelector("[data-publication-retrieved]");

const publicationTypeLabel = (publication) => {
  const type = publication.type === "legacy" ? publication.legacyType : publication.type;
  return {
    journal: "Journal article",
    conference: "Conference paper",
    "book-chapter": "Book chapter",
  }[type] || "International publication";
};

const createPublicationLink = (publication) => {
  const url = window.ICSLabContent.publicationUrl(publication);
  if (!url) return null;

  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Open publication ↗";
  link.setAttribute("aria-label", `Open publication from ${publication.year}`);
  return link;
};

const createCitation = (publication, membersById) => {
  const citation = document.createElement("p");
  window.ICSLabContent.appendPublicationCitation(citation, publication, membersById);
  return citation;
};

const renderRecentPublications = (publications, membersById) => {
  if (!recentPublications) return;

  const limit = Number(recentPublications.dataset.limit) || 4;
  recentPublications.replaceChildren(
    ...publications.slice(0, limit).map((publication) => {
      const article = document.createElement("article");
      const meta = document.createElement("div");
      const type = document.createElement("span");
      const year = document.createElement("time");
      const title = document.createElement("h3");

      meta.className = "publication-meta";
      type.textContent = publicationTypeLabel(publication);
      year.dateTime = String(publication.year);
      year.textContent = String(publication.year);
      meta.append(type, year);

      title.textContent = publication.title || "International publication";
      article.append(meta, title, createCitation(publication, membersById));

      const link = createPublicationLink(publication);
      if (link) article.append(link);
      return article;
    }),
  );
  recentPublications.removeAttribute("aria-busy");
};

const renderPublicationArchive = (publications, membersById) => {
  if (!publicationArchive) return;

  const groups = publications.reduce((years, publication) => {
    const yearPublications = years.get(publication.year) || [];
    yearPublications.push(publication);
    years.set(publication.year, yearPublications);
    return years;
  }, new Map());

  publicationArchive.replaceChildren(
    ...Array.from(groups, ([year, yearPublications]) => {
      const section = document.createElement("section");
      const heading = document.createElement("h2");
      const list = document.createElement("ol");

      section.className = "publication-year-group";
      heading.textContent = year;
      list.className = "publication-archive-list";
      list.setAttribute("aria-label", `${year} international publications`);

      yearPublications.forEach((publication) => {
        const item = document.createElement("li");
        const article = document.createElement("article");
        article.append(createCitation(publication, membersById));

        const link = createPublicationLink(publication);
        if (link) article.append(link);
        item.append(article);
        list.append(item);
      });

      section.append(heading, list);
      return section;
    }),
  );
  publicationArchive.removeAttribute("aria-busy");
};

const showPublicationError = () => {
  [recentPublications, publicationArchive].filter(Boolean).forEach((container) => {
    const message = document.createElement("p");
    message.className = "publication-error";
    message.textContent = "Publication data could not be loaded. Please refresh the page.";
    container.replaceChildren(message);
    container.removeAttribute("aria-busy");
  });
};

if (recentPublications || publicationArchive) {
  Promise.all([
    fetch("data/publications.json").then((response) => {
      if (!response.ok) throw new Error(`Publication request failed: ${response.status}`);
      return response.json();
    }),
    fetch("data/members.json").then((response) => {
      if (!response.ok) throw new Error(`Member request failed: ${response.status}`);
      return response.json();
    }),
  ])
    .then(([publicationData, memberData]) => {
      const visiblePublications = publicationData.publications.filter(({ status }) => status !== "draft");
      const membersById = new Map(memberData.members.map((member) => [member.id, member]));
      renderRecentPublications(visiblePublications, membersById);
      renderPublicationArchive(visiblePublications, membersById);
      if (publicationCount) publicationCount.textContent = visiblePublications.length;
      if (publicationRetrieved) {
        publicationRetrieved.dateTime = publicationData.retrieved;
        publicationRetrieved.textContent = publicationData.retrieved;
      }
    })
    .catch(showPublicationError);
}
