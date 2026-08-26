const recentNews = document.querySelector("[data-news-recent]");
const newsArchive = document.querySelector("[data-news-all]");

const createNewsCard = (item, detailed = false) => {
  const article = document.createElement("article");
  article.className = detailed ? "news-archive-item" : `news-card${item.featured ? " featured-news" : ""}`;
  article.id = item.slug;

  if (item.coverImage) {
    const image = document.createElement("img");
    image.src = item.coverImage;
    image.alt = item.coverAlt || "";
    image.width = 900;
    image.height = 560;
    image.loading = "lazy";
    article.append(image);
  }

  const body = document.createElement("div");
  const type = document.createElement("span");
  const title = document.createElement("h3");
  const link = document.createElement("a");
  const summary = document.createElement("p");
  const time = document.createElement("time");

  type.className = "news-type";
  type.textContent = item.category;
  link.href = `news.html#${item.slug}`;
  link.textContent = item.title;
  title.append(link);
  summary.textContent = item.summary;
  time.dateTime = item.date;
  time.textContent = item.date;
  body.append(type, time, title, summary);

  if (detailed) {
    const content = document.createElement("div");
    content.className = "news-body";
    (item.body || []).forEach((block) => {
      const node = document.createElement(block.type === "heading" ? "h4" : "p");
      node.textContent = block.text;
      content.append(node);
    });
    body.append(content);
  }

  article.append(body);
  return article;
};

const showNewsError = () => {
  [recentNews, newsArchive].filter(Boolean).forEach((container) => {
    const message = document.createElement("p");
    message.className = "publication-error";
    message.textContent = "News data could not be loaded. Please refresh the page.";
    container.replaceChildren(message);
    container.removeAttribute("aria-busy");
  });
};

if (recentNews || newsArchive) {
  fetch("data/news.json")
    .then((response) => {
      if (!response.ok) throw new Error(`News request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      const published = data.news
        .filter(({ status }) => status === "published")
        .sort((left, right) => right.date.localeCompare(left.date));
      if (recentNews) {
        const limit = Number(recentNews.dataset.limit) || 3;
        recentNews.replaceChildren(...published.slice(0, limit).map((item) => createNewsCard(item)));
        recentNews.removeAttribute("aria-busy");
      }
      if (newsArchive) {
        newsArchive.replaceChildren(...published.map((item) => createNewsCard(item, true)));
        newsArchive.removeAttribute("aria-busy");
      }
    })
    .catch(showNewsError);
}
