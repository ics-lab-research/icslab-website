(function () {
  const text = (value) => String(value ?? "").trim();

  const publicationUrl = (publication) => {
    const identifiers = publication.identifiers || {};
    if (identifiers.url) return identifiers.url;
    if (identifiers.doi) return `https://doi.org/${identifiers.doi}`;
    return publication.url || null;
  };

  const rankingText = (publication) => {
    const ranking = publication.ranking || {};
    const values = [];
    if (ranking.quartile) values.push(ranking.quartile);
    if (ranking.impactFactor !== null && ranking.impactFactor !== undefined && ranking.impactFactor !== "") {
      const year = ranking.impactFactorYear || "";
      values.push(`IF${year}: ${ranking.impactFactor}`);
    }
    (publication.indexing || []).forEach((item) => {
      if (item && !values.includes(item)) values.push(item);
    });
    return values.length ? `(${values.join(", ")}).` : "";
  };

  const structuredCitationText = (publication) => {
    const authors = (publication.authors || [])
      .map((author) => `${text(author.name)}${author.corresponding ? "*" : ""}`)
      .filter(Boolean)
      .join(", ");
    const venue = publication.venue || {};
    const identifiers = publication.identifiers || {};
    const details = [];
    if (venue.volume) details.push(`Volume ${venue.volume}`);
    if (venue.issue) details.push(`Issue ${venue.issue}`);
    if (venue.part) details.push(`Part ${venue.part}`);
    if (venue.pages) details.push(`pages ${venue.pages}`);
    if (venue.articleNumber) details.push(`article ${venue.articleNumber}`);
    if (publication.publicationDate && publication.publicationDate !== String(publication.year)) {
      details.push(publication.publicationDate);
    }

    const sections = [authors, text(publication.title), text(venue.name), ...details].filter(Boolean);
    const doi = identifiers.doi ? `DOI: https://doi.org/${identifiers.doi}` : "";
    if (doi) sections.push(doi);
    const ranking = rankingText(publication);
    return `${sections.join(", ")}${ranking ? `, ${ranking}` : "."}`;
  };

  const publicationCitationText = (publication) =>
    text(publication.citationOverride || publication.citation) || structuredCitationText(publication);

  const appendLegacyCitation = (container, publication, membersById) => {
    const citation = publicationCitationText(publication);
    const highlights = (publication.highlightedAuthors || [])
      .filter(({ name }) => text(name))
      .sort((left, right) => right.name.length - left.name.length);

    if (!highlights.length) {
      container.textContent = citation;
      return;
    }

    const expression = new RegExp(
      `(${highlights.map(({ name }) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "gi",
    );
    const highlightByName = new Map(highlights.map((item) => [item.name.toLowerCase(), item]));

    citation.split(expression).forEach((part) => {
      const highlight = highlightByName.get(part.toLowerCase());
      if (!highlight) {
        container.append(part);
        return;
      }

      const member = highlight.memberId ? membersById.get(highlight.memberId) : null;
      if (member?.highlightInPublications === false) {
        container.append(part);
        return;
      }

      const strong = document.createElement("strong");
      strong.className = "lab-author";
      strong.textContent = part;
      if (highlight.memberId) strong.dataset.memberId = highlight.memberId;
      container.append(strong);
    });
  };

  const appendStructuredCitation = (container, publication, membersById) => {
    const authors = publication.authors || [];
    authors.forEach((author, index) => {
      if (index) container.append(", ");
      const member = author.memberId ? membersById.get(author.memberId) : null;
      const shouldHighlight = author.memberId && member?.highlightInPublications !== false;
      const authorNode = shouldHighlight ? document.createElement("strong") : document.createTextNode("");
      if (shouldHighlight) {
        authorNode.className = "lab-author";
        authorNode.dataset.memberId = author.memberId;
        authorNode.textContent = author.name;
        container.append(authorNode);
      } else {
        container.append(author.name);
      }
      if (author.corresponding) container.append("*");
    });

    const fullText = structuredCitationText(publication);
    const authorText = authors
      .map((author) => `${text(author.name)}${author.corresponding ? "*" : ""}`)
      .join(", ");
    container.append(fullText.slice(authorText.length));
  };

  const appendPublicationCitation = (container, publication, membersById = new Map()) => {
    const hasOverride = text(publication.citationOverride || publication.citation);
    if (hasOverride) appendLegacyCitation(container, publication, membersById);
    else appendStructuredCitation(container, publication, membersById);
  };

  window.ICSLabContent = {
    appendPublicationCitation,
    publicationCitationText,
    publicationUrl,
    rankingText,
  };
})();
