const state = {
  publications: null,
  members: null,
  news: null,
  selectedPublication: null,
  selectedMember: null,
  selectedNews: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const statusNode = $("[data-status]");
const publicationForm = $("[data-publication-form]");
const memberForm = $("[data-member-form]");
const newsForm = $("[data-news-form]");

const setStatus = (message, type = "") => {
  statusNode.textContent = message;
  statusNode.className = `editor-status${type ? ` is-${type}` : ""}`;
};

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const numberOrNull = (value) => (value === "" ? null : Number(value));
const textOrNull = (value) => value.trim() || null;
const memberMap = () => new Map(state.members.content.members.map((member) => [member.id, member]));

const loadContent = async () => {
  const response = await fetch("/api/content", { cache: "no-store" });
  if (!response.ok) throw new Error(`Load failed: ${response.status}`);
  const content = await response.json();
  Object.assign(state, content);
  renderPublicationList();
  renderMemberList();
  renderNewsList();
  newPublication();
  newMember();
  newNews();
  setStatus("Ready. Saves write directly to repository JSON files.", "success");
};

const persist = async (kind, nextContent) => {
  const previousContent = state[kind].content;
  const response = await fetch(`/api/${kind}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: state[kind].revision, content: nextContent }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Save failed: ${response.status}`);
  state[kind].content = nextContent;
  state[kind].revision = result.revision;
  return previousContent;
};

const recordButton = (id, title, meta, selected, onClick) => {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.id = id;
  if (selected === id) button.setAttribute("aria-current", "true");
  const strong = document.createElement("strong");
  const span = document.createElement("span");
  strong.textContent = title;
  span.textContent = meta;
  button.append(strong, span);
  button.addEventListener("click", onClick);
  return button;
};

const renderPublicationList = () => {
  const query = $("[data-publication-search]").value.trim().toLowerCase();
  const list = $("[data-publication-list]");
  const records = state.publications.content.publications.filter((publication) =>
    [publication.title, publication.citationOverride, publication.year, publication.id]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
  list.replaceChildren(
    ...records.map((publication) =>
      recordButton(
        publication.id,
        publication.title || publication.citationOverride?.slice(0, 90) || publication.id,
        `${publication.year} · ${publication.type}`,
        state.selectedPublication,
        () => selectPublication(publication.id),
      ),
    ),
  );
};

const renderMemberList = () => {
  const query = $("[data-member-search]").value.trim().toLowerCase();
  const list = $("[data-member-list]");
  const records = state.members.content.members.filter((member) =>
    [member.displayName, ...(member.aliases || []), member.category].join(" ").toLowerCase().includes(query),
  );
  list.replaceChildren(
    ...records.map((member) =>
      recordButton(member.id, member.displayName, `${member.category} · ${member.status}`, state.selectedMember, () => selectMember(member.id)),
    ),
  );
};

const renderNewsList = () => {
  const query = $("[data-news-search]").value.trim().toLowerCase();
  const list = $("[data-news-list]");
  const records = state.news.content.news.filter((item) =>
    [item.title, item.category, item.date, item.slug].join(" ").toLowerCase().includes(query),
  );
  list.replaceChildren(
    ...records.map((item) =>
      recordButton(item.id, item.title, `${item.date} · ${item.status}`, state.selectedNews, () => selectNews(item.id)),
    ),
  );
};

const memberOptions = (selectedId) => {
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "External / unlinked";
  const options = state.members.content.members
    .slice()
    .sort((left, right) => left.displayName.localeCompare(right.displayName))
    .map((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = `${member.displayName} (${member.category})`;
      option.selected = member.id === selectedId;
      return option;
    });
  return [empty, ...options];
};

const authorRow = (author = { name: "", memberId: null, corresponding: false }) => {
  const row = document.createElement("div");
  row.className = "author-row";
  row.innerHTML = `
    <label>Printed author name <input data-author-name required /></label>
    <label>ICSLab member <select data-author-member></select></label>
    <label class="check-field"><input type="checkbox" data-author-corresponding /> Corresponding</label>
    <div class="author-actions">
      <button type="button" data-author-up aria-label="Move author up">↑</button>
      <button type="button" data-author-down aria-label="Move author down">↓</button>
      <button type="button" data-author-remove aria-label="Remove author">×</button>
    </div>`;
  $("[data-author-name]", row).value = author.name || "";
  $("[data-author-member]", row).replaceChildren(...memberOptions(author.memberId));
  $("[data-author-corresponding]", row).checked = Boolean(author.corresponding);
  return row;
};

const renderAuthors = (authors = []) => {
  $("[data-author-list]").replaceChildren(...authors.map(authorRow));
};

const collectAuthors = () =>
  $$(".author-row", $("[data-author-list]")).map((row) => ({
    name: $("[data-author-name]", row).value.trim(),
    memberId: $("[data-author-member]", row).value || null,
    corresponding: $("[data-author-corresponding]", row).checked,
  }));

const publicationFromForm = () => {
  const values = new FormData(publicationForm);
  const selected = state.publications.content.publications.find(({ id }) => id === state.selectedPublication);
  const doi = values.get("doi").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  return {
    id: values.get("id").trim(),
    type: values.get("type"),
    legacyType: textOrNull(values.get("legacyType")),
    status: values.get("status"),
    year: Number(values.get("year")),
    publicationDate: values.get("publicationDate").trim() || String(values.get("year")),
    title: textOrNull(values.get("title")),
    authors: collectAuthors(),
    venue: {
      name: textOrNull(values.get("venueName")),
      volume: textOrNull(values.get("volume")),
      issue: textOrNull(values.get("issue")),
      part: textOrNull(values.get("part")),
      pages: textOrNull(values.get("pages")),
      articleNumber: textOrNull(values.get("articleNumber")),
      publisher: textOrNull(values.get("publisher")),
    },
    identifiers: {
      doi: doi || null,
      url: textOrNull(values.get("url")) || (doi ? `https://doi.org/${doi}` : null),
    },
    ranking: {
      quartile: textOrNull(values.get("quartile")),
      quartileYear: numberOrNull(values.get("quartileYear")),
      impactFactor: numberOrNull(values.get("impactFactor")),
      impactFactorYear: numberOrNull(values.get("impactFactorYear")),
      system: textOrNull(values.get("rankingSystem")),
    },
    indexing: values.get("indexing").split(",").map((item) => item.trim()).filter(Boolean),
    highlightedAuthors: selected?.highlightedAuthors || [],
    citationOverride: textOrNull(values.get("citationOverride")),
  };
};

const updatePublicationPreview = () => {
  if (!state.members) return;
  const publication = publicationFromForm();
  $("[data-publication-preview-title]").textContent = publication.title || "International publication";
  const citation = $("[data-publication-preview-citation]");
  citation.replaceChildren();
  window.ICSLabContent.appendPublicationCitation(citation, publication, memberMap());
  $("[data-legacy-note]").hidden = publication.type !== "legacy";
};

const fillPublicationForm = (publication) => {
  const fields = {
    id: publication.id,
    type: publication.type,
    legacyType: publication.legacyType || "",
    status: publication.status,
    year: publication.year,
    publicationDate: publication.publicationDate || "",
    title: publication.title || "",
    venueName: publication.venue?.name || "",
    volume: publication.venue?.volume || "",
    issue: publication.venue?.issue || "",
    part: publication.venue?.part || "",
    pages: publication.venue?.pages || "",
    articleNumber: publication.venue?.articleNumber || "",
    publisher: publication.venue?.publisher || "",
    doi: publication.identifiers?.doi || "",
    url: publication.identifiers?.url || "",
    quartile: publication.ranking?.quartile || "",
    quartileYear: publication.ranking?.quartileYear || "",
    impactFactor: publication.ranking?.impactFactor ?? "",
    impactFactorYear: publication.ranking?.impactFactorYear || "",
    rankingSystem: publication.ranking?.system || "",
    indexing: (publication.indexing || []).join(", "),
    citationOverride: publication.citationOverride || "",
  };
  Object.entries(fields).forEach(([name, value]) => {
    publicationForm.elements[name].value = value;
  });
  publicationForm.elements.id.readOnly = Boolean(state.selectedPublication);
  renderAuthors(publication.authors || []);
  $("[data-delete-publication]").hidden = !state.selectedPublication;
  $("[data-publication-form-title]").textContent = publication.title || publication.id || "New publication";
  updatePublicationPreview();
};

const selectPublication = (id) => {
  state.selectedPublication = id;
  fillPublicationForm(state.publications.content.publications.find((publication) => publication.id === id));
  renderPublicationList();
};

const newPublication = () => {
  state.selectedPublication = null;
  publicationForm.reset();
  fillPublicationForm({
    id: "", type: "journal", status: "draft", year: new Date().getFullYear(), publicationDate: "",
    title: "", authors: [], venue: {}, identifiers: {}, ranking: {}, indexing: [], citationOverride: null,
  });
  publicationForm.elements.id.readOnly = false;
  renderPublicationList();
};

publicationForm.addEventListener("input", () => {
  if (!state.selectedPublication && !publicationForm.elements.id.value) {
    publicationForm.elements.id.value = slugify(publicationForm.elements.title.value);
  }
  updatePublicationPreview();
});
publicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const publication = publicationFromForm();
    const content = structuredClone(state.publications.content);
    const index = content.publications.findIndex(({ id }) => id === state.selectedPublication);
    if (index >= 0) content.publications[index] = publication;
    else content.publications.unshift(publication);
    content.publications.sort((left, right) => right.year - left.year);
    setStatus("Saving publication…");
    await persist("publications", content);
    state.selectedPublication = publication.id;
    renderPublicationList();
    fillPublicationForm(publication);
    setStatus("Publication saved to data/publications.json.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

$("[data-author-list]").addEventListener("click", (event) => {
  const row = event.target.closest(".author-row");
  if (!row) return;
  if (event.target.matches("[data-author-remove]")) row.remove();
  if (event.target.matches("[data-author-up]") && row.previousElementSibling) row.before(row.previousElementSibling);
  if (event.target.matches("[data-author-down]") && row.nextElementSibling) row.after(row.nextElementSibling);
  updatePublicationPreview();
});
$("[data-add-author]").addEventListener("click", () => {
  $("[data-author-list]").append(authorRow());
  updatePublicationPreview();
});
$("[data-new-publication]").addEventListener("click", newPublication);
$("[data-delete-publication]").addEventListener("click", async () => {
  if (!confirm("Delete this publication from the dataset?")) return;
  try {
    const content = structuredClone(state.publications.content);
    content.publications = content.publications.filter(({ id }) => id !== state.selectedPublication);
    await persist("publications", content);
    newPublication();
    setStatus("Publication deleted.", "success");
  } catch (error) { setStatus(error.message, "error"); }
});

const fillMemberForm = (member) => {
  Object.entries({
    id: member.id || "", displayName: member.displayName || "", category: member.category || "student",
    status: member.status || "active", aliases: (member.aliases || []).join("\n"), profileUrl: member.profileUrl || "",
  }).forEach(([name, value]) => { memberForm.elements[name].value = value; });
  memberForm.elements.highlightInPublications.checked = member.highlightInPublications !== false;
  memberForm.elements.id.readOnly = Boolean(state.selectedMember);
  $("[data-delete-member]").hidden = !state.selectedMember;
  $("[data-member-form-title]").textContent = member.displayName || "New member";
};

const selectMember = (id) => {
  state.selectedMember = id;
  fillMemberForm(state.members.content.members.find((member) => member.id === id));
  renderMemberList();
};
const newMember = () => { state.selectedMember = null; memberForm.reset(); fillMemberForm({}); memberForm.elements.id.readOnly = false; renderMemberList(); };

memberForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const values = new FormData(memberForm);
    const member = {
      id: values.get("id").trim(), displayName: values.get("displayName").trim(),
      aliases: values.get("aliases").split("\n").map((item) => item.trim()).filter(Boolean),
      category: values.get("category"), status: values.get("status"),
      highlightInPublications: memberForm.elements.highlightInPublications.checked,
      profileUrl: textOrNull(values.get("profileUrl")),
    };
    if (!member.aliases.includes(member.displayName)) member.aliases.unshift(member.displayName);
    const content = structuredClone(state.members.content);
    const index = content.members.findIndex(({ id }) => id === state.selectedMember);
    if (index >= 0) content.members[index] = member; else content.members.push(member);
    content.members.sort((left, right) => left.displayName.localeCompare(right.displayName));
    await persist("members", content);
    state.selectedMember = member.id;
    renderMemberList(); fillMemberForm(member);
    setStatus("Member saved to data/members.json.", "success");
  } catch (error) { setStatus(error.message, "error"); }
});
memberForm.elements.displayName.addEventListener("input", () => {
  if (!state.selectedMember && !memberForm.elements.id.value) {
    memberForm.elements.id.value = slugify(memberForm.elements.displayName.value);
  }
});
$("[data-new-member]").addEventListener("click", newMember);
$("[data-delete-member]").addEventListener("click", async () => {
  if (!confirm("Delete this member? Publications referencing the ID will block the save.")) return;
  try {
    const content = structuredClone(state.members.content);
    content.members = content.members.filter(({ id }) => id !== state.selectedMember);
    await persist("members", content);
    newMember(); setStatus("Member deleted.", "success");
  } catch (error) { setStatus(error.message, "error"); }
});

const bodyToText = (body = []) => body.map((block) => block.type === "heading" ? `## ${block.text}` : block.text).join("\n\n");
const textToBody = (body) => body.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean).map((value) =>
  value.startsWith("## ") ? { type: "heading", text: value.slice(3).trim() } : { type: "paragraph", text: value },
);

const newsFromForm = () => {
  const values = new FormData(newsForm);
  return {
    id: values.get("id").trim(), slug: values.get("slug").trim(), title: values.get("title").trim(),
    date: values.get("date").trim(), category: values.get("category").trim(), summary: values.get("summary").trim(),
    body: textToBody(values.get("body")), coverImage: textOrNull(values.get("coverImage")),
    coverAlt: textOrNull(values.get("coverAlt")), featured: newsForm.elements.featured.checked, status: values.get("status"),
  };
};

const updateNewsPreview = () => {
  const item = newsFromForm();
  const preview = $("[data-news-preview]");
  preview.replaceChildren();
  if (item.coverImage) {
    const image = document.createElement("img");
    image.src = `/${item.coverImage}`;
    image.alt = item.coverAlt || "";
    preview.append(image);
  }
  const type = document.createElement("p"); type.textContent = item.category || "Category";
  const title = document.createElement("h3"); title.textContent = item.title || "News title";
  const summary = document.createElement("p"); summary.textContent = item.summary || "News summary";
  preview.append(type, title, summary);
};

const fillNewsForm = (item) => {
  Object.entries({
    id:item.id||"", slug:item.slug||"", title:item.title||"", date:item.date||"", category:item.category||"",
    status:item.status||"draft", summary:item.summary||"", body:bodyToText(item.body), coverImage:item.coverImage||"", coverAlt:item.coverAlt||"",
  }).forEach(([name,value]) => { newsForm.elements[name].value=value; });
  newsForm.elements.featured.checked=Boolean(item.featured);
  newsForm.elements.id.readOnly=Boolean(state.selectedNews);
  $("[data-delete-news]").hidden=!state.selectedNews;
  $("[data-news-form-title]").textContent=item.title||"New news item";
  updateNewsPreview();
};
const selectNews = (id) => { state.selectedNews=id; fillNewsForm(state.news.content.news.find((item)=>item.id===id)); renderNewsList(); };
const newNews = () => { state.selectedNews=null; newsForm.reset(); fillNewsForm({status:"draft",date:String(new Date().getFullYear()),body:[]}); newsForm.elements.id.readOnly=false; renderNewsList(); };
newsForm.addEventListener("input", () => {
  if (!state.selectedNews && !newsForm.elements.id.value) {
    const generated = slugify(newsForm.elements.title.value);
    newsForm.elements.id.value = generated;
    newsForm.elements.slug.value = generated;
  }
  updateNewsPreview();
});
newsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const item=newsFromForm(); const content=structuredClone(state.news.content);
    const index=content.news.findIndex(({id})=>id===state.selectedNews);
    if(index>=0)content.news[index]=item;else content.news.unshift(item);
    content.news.sort((left,right)=>right.date.localeCompare(left.date));
    await persist("news",content); state.selectedNews=item.id; renderNewsList(); fillNewsForm(item);
    setStatus("News saved to data/news.json.","success");
  } catch(error){setStatus(error.message,"error");}
});
$("[data-new-news]").addEventListener("click",newNews);
$("[data-delete-news]").addEventListener("click",async()=>{
  if(!confirm("Delete this news item?"))return;
  try{const content=structuredClone(state.news.content);content.news=content.news.filter(({id})=>id!==state.selectedNews);await persist("news",content);newNews();setStatus("News deleted.","success");}
  catch(error){setStatus(error.message,"error");}
});

$$('[data-tab]').forEach((button) => button.addEventListener('click', () => {
  $$('[data-tab]').forEach((tab) => tab.setAttribute('aria-selected', String(tab === button)));
  $$('[data-panel]').forEach((panel) => {
    const active = panel.dataset.panel === button.dataset.tab;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
}));
$("[data-publication-search]").addEventListener("input",renderPublicationList);
$("[data-member-search]").addEventListener("input",renderMemberList);
$("[data-news-search]").addEventListener("input",renderNewsList);

loadContent().catch((error) => setStatus(error.message, "error"));
