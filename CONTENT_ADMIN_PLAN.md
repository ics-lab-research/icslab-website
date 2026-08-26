# ICSLab Content Administration Plan

## Status

Localhost MVP implemented. GitHub authentication, pull-request automation, and
preview deployments remain future work.

## Goals

- Let a local lab editor add and update publications and news without editing code.
- Keep the public website deployable as static files from the repository root.
- Store content outside HTML files.
- Generate consistent publication citations from structured data.
- Bold ICSLab authors in recent and full publication views.
- Require review before strict publication data becomes public.
- Preserve change history and support rollback.

## Recommended Architecture

Keep the public website static. The MVP is a dependency-free localhost editor
inside this repository. It binds to `127.0.0.1`, requires no sign-in, validates
content, and writes structured JSON directly to the working tree.

Publishing workflow:

1. An editor starts the localhost application.
2. The editor creates or updates a publication or news item.
3. The application validates the content and shows the exact website preview.
4. The application writes validated JSON atomically.
5. The editor reviews `git diff` with the professor.
6. Committing and pushing publishes the static website through GitHub Pages.

Git remains the initial source of truth. Do not introduce a database until
concurrent editing, advanced querying, or other proven requirements make it
necessary.

## Repository Responsibilities

### Public Website

- Render homepage content, recent publications, all publications, members, and news.
- Read structured data committed to the repository.
- Remain dependency-free where practical.
- Never contain administration credentials or GitHub access tokens.

### Administration Application

- Bind only to localhost and reject foreign hosts and origins.
- Provide publication, member, and news forms.
- Validate structured data.
- Preview the exact public rendering.
- Upload optimized images.
- Write validated files directly; Git review remains the approval gate.

## Publication Data Model

Replace raw citation-only records with structured publication records.

Example shape:

```json
{
  "id": "measurement-2026-122892",
  "type": "journal",
  "year": 2026,
  "publicationDate": "2026",
  "title": "Dual-sensor convergence probe...",
  "authors": [
    {
      "name": "Minhhuy Le",
      "memberId": "minhhuy-le",
      "corresponding": false
    },
    {
      "name": "Le Quang Trung",
      "memberId": null,
      "corresponding": true
    }
  ],
  "venue": {
    "name": "Measurement",
    "volume": "290",
    "part": "B",
    "issue": null,
    "pages": null,
    "articleNumber": "122892"
  },
  "identifiers": {
    "doi": "10.1016/j.measurement.2026.122892",
    "url": "https://doi.org/10.1016/j.measurement.2026.122892"
  },
  "ranking": {
    "quartile": "Q1",
    "quartileYear": 2025,
    "impactFactor": 6.1,
    "impactFactorYear": 2025,
    "system": "JCR"
  },
  "indexing": ["SCIE", "Scopus"],
  "status": "published",
  "citationOverride": null
}
```

Supported publication types should initially be limited to types already used
by the lab:

- Journal article
- Conference paper
- Book chapter

Add other types only when real records require them.

### Required Publication Fields

- Stable ID
- Publication type
- Year
- Title
- Ordered authors
- Venue name
- Publication status

### Optional Publication Fields

- Full publication date
- Volume
- Issue
- Part
- Page range
- Article number
- Publisher
- DOI
- External URL
- Quartile, source, and year
- Impact factor, source, and year
- Indexing services
- Exceptional citation override

Do not store a quartile or impact factor without its measurement year and source.

## Member Registry

Create `data/members.json` with stable member IDs.

Example shape:

```json
{
  "id": "minhhuy-le",
  "displayName": "Minhhuy Le",
  "aliases": ["Minh-Huy Le", "Minhuy Le", "Minhhuy Le"],
  "category": "professor",
  "status": "active",
  "highlightInPublications": true
}
```

Initial member categories:

- Professor
- PhD
- Research assistant
- Student
- Alumni

Publication authors must preserve the name exactly printed in the paper. A
separate `memberId` links that author to the member registry. Rendering rules:

- Bold an author when a valid `memberId` is present and highlighting is enabled.
- Render the corresponding-author marker from `corresponding`, independently of bolding.
- Use aliases only to help editors match imported names.
- Never rely on browser-time string matching to decide whether an author is a lab member.
- Permit manual member-link overrides for ambiguous names and historical affiliations.

The professor must decide whether alumni are always highlighted or only for
papers produced while they were affiliated with ICSLab.

## Citation Standard

Before implementation, obtain professor approval for a one-page ICSLab citation
specification covering:

- Author order and separators
- Lab-author bolding
- Corresponding-author marker
- Paper-title capitalization
- Journal and conference name formatting
- Volume, issue, part, pages, and article number
- Publication date
- DOI display format
- Quartile source and year
- Impact-factor source and year
- Scopus, SCIE, and ESCI labels
- Accepted and online-first records
- Journal, conference, and book-chapter differences

The website must generate citations from structured fields. Use
`citationOverride` only for records that cannot follow the approved rules.

## News Data Model

Initial news fields:

- Stable ID
- URL slug
- Title
- Publication date
- Summary
- Content blocks
- Category
- Cover image
- Required image alternative text
- Featured flag
- Draft or published status
- Optional external links

Keep the initial content-block types small: paragraph, heading, image, and link.
Add richer blocks only when real news content requires them.

## Administration MVP

### Publication Form

- Publication type selector
- Title
- Ordered author editor
- Member search and linking
- Corresponding-author checkbox
- Journal, conference, or book name
- Year and publication date
- Volume, issue, part, pages, and article number
- DOI and external URL
- Quartile, ranking source, and ranking year
- Impact factor, source, and year
- Indexing services
- Publication status
- Exact citation preview
- Homepage recent-publication preview
- Duplicate DOI warning

### News Form

- Title and slug
- Publication date
- Summary
- Limited content-block editor
- Category
- Cover-image upload
- Required image alternative text
- Featured setting
- Draft or published status
- Listing-card and detail-page previews

### Member Form

- Display name
- Name aliases
- Category
- Active or alumni status
- Publication-highlighting setting
- Profile information used by the public member pages

## Validation

Run validation both in the administration application and in GitHub Actions.

Required checks:

- Valid JSON and expected schema
- Unique publication IDs
- Unique news IDs and slugs
- Duplicate DOI detection
- Required publication fields
- Ordered, non-empty author lists
- Valid referenced `memberId` values
- Ranking year and source when a quartile is present
- Impact-factor year and source when an impact factor is present
- Valid DOI and external URL formats
- Required image alternative text
- Existing referenced image files
- No publication rendering failure

## Review and Publishing Rules

- Default all new records to draft.
- Require an exact citation preview before submission.
- Review `git diff` after every editor session.
- Require professor approval for publication changes.
- Publish only after commit and push.
- Preserve Git history for auditing and rollback.

The localhost editor writes directly to the working tree. It does not commit,
push, or publish automatically.

## Implementation Phases

### Phase 1: Content Rules

Status: partially complete. Schemas exist; professor policy decisions remain.

1. Obtain professor approval for the citation specification.
2. Decide quartile and impact-factor sources.
3. Decide alumni-highlighting policy.
4. Define publication, member, and news schemas.

Verification: approved written rules and example citations for every supported
publication type.

### Phase 2: Structured Public Data

Status: MVP complete with a lossless legacy bridge. Manual bibliographic review remains.

1. Create the member registry with stable IDs and aliases.
2. Preserve all existing citations while adding IDs, ranking fields, and author highlights.
3. Manually convert legacy records to fully structured records after professor review.
4. Update recent and full publication renderers.
5. Add automated schema and rendering checks.

Verification: all records render in the approved format, lab authors are bold,
and corresponding authors are marked correctly.

### Phase 3: Administration MVP

Status: implemented.

1. Create the repository-local localhost application.
2. Bind to `127.0.0.1` and reject foreign hosts and origins.
3. Implement publication, member, and news forms.
4. Add exact website previews.
5. Add validated atomic repository writes.

Verification: a local editor can update repository content without manually
editing JSON files, then review the resulting Git diff.

### Phase 4: Publishing Hardening

Status: future work if remote multi-user editing becomes necessary.

1. Add GitHub Actions validation.
2. Add image optimization and upload checks.
3. Add role-based approval rules.
4. Document editor and reviewer workflows.

Verification: invalid content cannot merge, approved content publishes, and a
previous version can be restored from Git history.

### Later Enhancements

- DOI metadata lookup to prefill forms
- Draft preview deployments
- Search and filtering
- Export to professor CV formats
- ORCID integration
- Publication statistics
- Optional GitHub pull-request automation
- Optional authenticated remote editor

These are not part of the MVP.

## Remaining Decisions

1. What exact citation format does the professor approve?
2. Which source defines quartiles: JCR, SJR, or another system?
3. Which source defines impact factors?
4. Should alumni always appear bold?
5. Who can edit, review, and publish?
6. Should member data also power the public people pages?
7. Is remote multi-user editing needed later?

## Success Criteria

- A lab editor adds publications and news through forms rather than code.
- Publication records contain structured bibliographic and ranking data.
- Recent and full views use the same authoritative dataset.
- ICSLab authors are identified by stable member IDs and rendered in bold.
- Citations follow the professor-approved format.
- Invalid records are blocked before publishing.
- Every committed public content change has review history and rollback support.

## Existing Sources to Review During Migration

- International publications:
  `https://icslab.phenikaa-uni.edu.vn/publications/international-publications`
- Professors: `https://icslab.phenikaa-uni.edu.vn/members/professors`
- PhD members, research assistants, students, and alumni under the existing
  ICSLab members section

Do not access or import the broken domestic-publications source until a working,
verified source is provided.
