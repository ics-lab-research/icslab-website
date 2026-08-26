#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import tempfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[2]
EDITOR_ROOT = Path(__file__).resolve().parent
DATA_FILES = {
    "publications": ROOT / "data" / "publications.json",
    "members": ROOT / "data" / "members.json",
    "news": ROOT / "data" / "news.json",
}
MAX_BODY_SIZE = 5 * 1024 * 1024
ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_PATTERN = re.compile(r"^\d{4}(?:-\d{2}-\d{2})?$")
DOI_PATTERN = re.compile(r"^10\.\d{4,9}/\S+$", re.IGNORECASE)
PUBLICATION_TYPES = {"journal", "conference", "book-chapter", "legacy"}
PUBLICATION_STATUSES = {"draft", "accepted", "online-first", "published"}
MEMBER_CATEGORIES = {"professor", "phd", "research-assistant", "student", "alumni"}
MEMBER_STATUSES = {"active", "alumni", "inactive"}
NEWS_STATUSES = {"draft", "published"}


class ValidationError(ValueError):
    pass


def revision(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def require(condition, message):
    if not condition:
        raise ValidationError(message)


def require_id(value, label):
    require(isinstance(value, str) and ID_PATTERN.fullmatch(value), f"{label} must be a kebab-case ID")


def validate_members(content):
    require(isinstance(content, dict), "Member content must be an object")
    members = content.get("members")
    require(isinstance(members, list), "members must be an array")
    seen = set()
    for index, member in enumerate(members):
        label = f"members[{index}]"
        require(isinstance(member, dict), f"{label} must be an object")
        require_id(member.get("id"), f"{label}.id")
        require(member["id"] not in seen, f"Duplicate member ID: {member['id']}")
        seen.add(member["id"])
        require(isinstance(member.get("displayName"), str) and member["displayName"].strip(), f"{label}.displayName is required")
        require(member.get("category") in MEMBER_CATEGORIES, f"{label}.category is invalid")
        require(member.get("status") in MEMBER_STATUSES, f"{label}.status is invalid")
        require(isinstance(member.get("aliases", []), list), f"{label}.aliases must be an array")
        require(isinstance(member.get("highlightInPublications"), bool), f"{label}.highlightInPublications must be boolean")
    return seen


def validate_publications(content, member_ids):
    require(isinstance(content, dict), "Publication content must be an object")
    publications = content.get("publications")
    require(isinstance(publications, list), "publications must be an array")
    seen_ids = set()
    seen_dois = set()
    for index, publication in enumerate(publications):
        label = f"publications[{index}]"
        require(isinstance(publication, dict), f"{label} must be an object")
        require_id(publication.get("id"), f"{label}.id")
        require(publication["id"] not in seen_ids, f"Duplicate publication ID: {publication['id']}")
        seen_ids.add(publication["id"])
        require(publication.get("type") in PUBLICATION_TYPES, f"{label}.type is invalid")
        require(publication.get("status") in PUBLICATION_STATUSES, f"{label}.status is invalid")
        require(isinstance(publication.get("year"), int) and 1900 <= publication["year"] <= 2100, f"{label}.year is invalid")
        authors = publication.get("authors", [])
        require(isinstance(authors, list), f"{label}.authors must be an array")
        if publication.get("type") != "legacy":
            require(isinstance(publication.get("title"), str) and publication["title"].strip(), f"{label}.title is required")
            require(authors, f"{label}.authors requires at least one author")
            require(isinstance(publication.get("venue"), dict) and str(publication["venue"].get("name", "")).strip(), f"{label}.venue.name is required")
        else:
            require(str(publication.get("citationOverride") or "").strip(), f"{label}.citationOverride is required")
        for author_index, author in enumerate(authors):
            author_label = f"{label}.authors[{author_index}]"
            require(isinstance(author, dict), f"{author_label} must be an object")
            require(isinstance(author.get("name"), str) and author["name"].strip(), f"{author_label}.name is required")
            require(isinstance(author.get("corresponding", False), bool), f"{author_label}.corresponding must be boolean")
            member_id = author.get("memberId")
            require(member_id is None or member_id in member_ids, f"{author_label}.memberId is unknown")
        for highlight_index, highlight in enumerate(publication.get("highlightedAuthors", [])):
            highlight_label = f"{label}.highlightedAuthors[{highlight_index}]"
            require(isinstance(highlight.get("name"), str) and highlight["name"].strip(), f"{highlight_label}.name is required")
            member_id = highlight.get("memberId")
            require(member_id is None or member_id in member_ids, f"{highlight_label}.memberId is unknown")
        identifiers = publication.get("identifiers", {})
        doi = str(identifiers.get("doi") or "").strip()
        if doi:
            require(DOI_PATTERN.fullmatch(doi), f"{label}.identifiers.doi is invalid")
            normalized_doi = doi.lower()
            require(normalized_doi not in seen_dois, f"Duplicate DOI: {doi}")
            seen_dois.add(normalized_doi)
        ranking = publication.get("ranking", {})
        if publication.get("type") != "legacy" and ranking.get("quartile"):
            require(ranking.get("quartileYear"), f"{label}.ranking.quartileYear is required")
            require(ranking.get("system"), f"{label}.ranking.system is required")
        if publication.get("type") != "legacy" and ranking.get("impactFactor") not in (None, ""):
            require(ranking.get("impactFactorYear"), f"{label}.ranking.impactFactorYear is required")
            require(ranking.get("system"), f"{label}.ranking.system is required")


def validate_news(content):
    require(isinstance(content, dict), "News content must be an object")
    news = content.get("news")
    require(isinstance(news, list), "news must be an array")
    seen_ids = set()
    seen_slugs = set()
    for index, item in enumerate(news):
        label = f"news[{index}]"
        require(isinstance(item, dict), f"{label} must be an object")
        require_id(item.get("id"), f"{label}.id")
        require_id(item.get("slug"), f"{label}.slug")
        require(item["id"] not in seen_ids, f"Duplicate news ID: {item['id']}")
        require(item["slug"] not in seen_slugs, f"Duplicate news slug: {item['slug']}")
        seen_ids.add(item["id"])
        seen_slugs.add(item["slug"])
        require(isinstance(item.get("title"), str) and item["title"].strip(), f"{label}.title is required")
        require(DATE_PATTERN.fullmatch(str(item.get("date", ""))), f"{label}.date must be YYYY or YYYY-MM-DD")
        require(item.get("status") in NEWS_STATUSES, f"{label}.status is invalid")
        require(isinstance(item.get("summary"), str) and item["summary"].strip(), f"{label}.summary is required")
        require(isinstance(item.get("body", []), list), f"{label}.body must be an array")
        image = str(item.get("coverImage", "")).strip()
        if image:
            require(image.startswith("assets/") and (ROOT / image).is_file(), f"{label}.coverImage does not exist")
            require(isinstance(item.get("coverAlt"), str) and item["coverAlt"].strip(), f"{label}.coverAlt is required")


def validate_all(kind, content):
    members = content if kind == "members" else read_json(DATA_FILES["members"])
    member_ids = validate_members(members)
    if kind == "members":
        publications = read_json(DATA_FILES["publications"])
        validate_publications(publications, member_ids)
    elif kind == "publications":
        validate_publications(content, member_ids)
    elif kind == "news":
        validate_news(content)
    else:
        raise ValidationError("Unknown content type")


def atomic_write(path, content):
    serialized = json.dumps(content, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temp:
        temp.write(serialized)
        temp.flush()
        os.fsync(temp.fileno())
        temp_path = Path(temp.name)
    os.replace(temp_path, path)


class EditorHandler(BaseHTTPRequestHandler):
    server_version = "ICSLabEditor/1.0"

    def _allowed_request(self):
        expected_hosts = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
        if self.headers.get("Host") not in expected_hosts:
            self.send_error(HTTPStatus.FORBIDDEN, "Localhost requests only")
            return False
        origin = self.headers.get("Origin")
        if origin and urlparse(origin).netloc not in expected_hosts:
            self.send_error(HTTPStatus.FORBIDDEN, "Foreign origin rejected")
            return False
        return True

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path, content_type):
        body = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._allowed_request():
            return
        route = urlparse(self.path).path
        if route == "/":
            self.send_response(HTTPStatus.SEE_OTHER)
            self.send_header("Location", "/editor/")
            self.end_headers()
        elif route == "/editor/":
            self._file(EDITOR_ROOT / "index.html", "text/html; charset=utf-8")
        elif route == "/editor/editor.css":
            self._file(EDITOR_ROOT / "editor.css", "text/css; charset=utf-8")
        elif route == "/editor/editor.js":
            self._file(EDITOR_ROOT / "editor.js", "text/javascript; charset=utf-8")
        elif route == "/shared/content-format.js":
            self._file(ROOT / "content-format.js", "text/javascript; charset=utf-8")
        elif route.startswith("/assets/"):
            asset = (ROOT / route.lstrip("/")).resolve()
            assets_root = (ROOT / "assets").resolve()
            if assets_root not in asset.parents or not asset.is_file():
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            content_type = "image/webp" if asset.suffix == ".webp" else "image/png" if asset.suffix == ".png" else "image/jpeg"
            self._file(asset, content_type)
        elif route == "/api/content":
            payload = {
                kind: {"revision": revision(path), "content": read_json(path)}
                for kind, path in DATA_FILES.items()
            }
            self._json(HTTPStatus.OK, payload)
        elif route == "/api/health":
            self._json(HTTPStatus.OK, {"status": "ok"})
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_PUT(self):
        if not self._allowed_request():
            return
        route = urlparse(self.path).path
        kind = route.removeprefix("/api/")
        if kind not in DATA_FILES or route != f"/api/{kind}":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if self.headers.get_content_type() != "application/json":
            self.send_error(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "JSON required")
            return
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_BODY_SIZE:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return
        try:
            payload = json.loads(self.rfile.read(length))
            path = DATA_FILES[kind]
            if payload.get("revision") != revision(path):
                self._json(HTTPStatus.CONFLICT, {"error": "File changed on disk. Reload before saving."})
                return
            content = payload.get("content")
            validate_all(kind, content)
            atomic_write(path, content)
            self._json(HTTPStatus.OK, {"revision": revision(path)})
        except (json.JSONDecodeError, ValidationError, KeyError, TypeError) as error:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

    def log_message(self, format, *args):
        print(f"{self.client_address[0]} - {format % args}")


def main():
    parser = argparse.ArgumentParser(description="ICSLab localhost content editor")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), EditorHandler)
    print(f"ICSLab editor: http://127.0.0.1:{args.port}/editor/")
    print("Localhost only. Stop with Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
