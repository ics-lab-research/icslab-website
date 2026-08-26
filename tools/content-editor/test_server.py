import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import server


class ContentValidationTest(unittest.TestCase):
    def setUp(self):
        self.members = {
            "version": 1,
            "members": [
                {
                    "id": "minhhuy-le",
                    "displayName": "Minhhuy Le",
                    "aliases": ["Minhhuy Le"],
                    "category": "professor",
                    "status": "active",
                    "highlightInPublications": True,
                }
            ],
        }

    def test_structured_publication_requires_ranking_year(self):
        publication = {
            "id": "example-paper",
            "type": "journal",
            "year": 2026,
            "publicationDate": "2026",
            "addedDate": "2026-08-26",
            "title": "Example",
            "authors": [{"name": "Minhhuy Le", "memberId": "minhhuy-le", "corresponding": True}],
            "venue": {"name": "Measurement"},
            "identifiers": {"doi": "10.1000/example"},
            "ranking": {"quartile": "Q1", "system": "JCR"},
            "indexing": [],
            "status": "published",
        }
        with self.assertRaisesRegex(server.ValidationError, "quartileYear"):
            server.validate_publications({"publications": [publication]}, {"minhhuy-le"})

    def test_atomic_write_replaces_complete_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "data.json"
            path.write_text("{}\n")
            server.atomic_write(path, self.members)
            self.assertEqual(json.loads(path.read_text()), self.members)

    def test_csl_metadata_maps_to_publication_fields(self):
        metadata = server.csl_to_publication_metadata(
            {
                "DOI": "10.1000/example",
                "type": "journal-article",
                "title": "Example paper",
                "container-title": "Example Journal",
                "volume": "12",
                "issue": "3",
                "page": "45-50",
                "article-number": "45-50",
                "publisher": "Example Publisher",
                "issued": {"date-parts": [[2026, 8, 26]]},
                "author": [{"given": "Minhhuy", "family": "Le"}],
            },
            "10.1000/example",
        )
        self.assertEqual(metadata["type"], "journal")
        self.assertEqual(metadata["publicationDate"], "2026-08-26")
        self.assertEqual(metadata["authors"][0]["name"], "Minhhuy Le")
        self.assertEqual(metadata["venue"]["name"], "Example Journal")
        self.assertIsNone(metadata["venue"]["pages"])
        self.assertEqual(metadata["venue"]["articleNumber"], "45-50")

    def test_csl_metadata_prefers_exact_online_date(self):
        year, publication_date = server.csl_date(
            {
                "published-online": {"date-parts": [[2026, 8, 20]]},
                "issued": {"date-parts": [[2026]]},
            }
        )
        self.assertEqual((year, publication_date), (2026, "2026-08-20"))

    def test_csl_metadata_preserves_month_precision(self):
        year, publication_date = server.csl_date({"issued": {"date-parts": [[2026, 8]]}})
        self.assertEqual((year, publication_date), (2026, "2026-08"))

    def test_normalize_doi_accepts_resolver_url(self):
        self.assertEqual(server.normalize_doi("https://doi.org/10.1000/example"), "10.1000/example")

    def test_publication_date_rejects_invalid_calendar_date(self):
        with self.assertRaisesRegex(server.ValidationError, "valid date"):
            server.require_publication_date("2026-02-30", 2026, "publicationDate")

    def test_sort_date_fills_only_missing_components(self):
        self.assertEqual(
            server.publication_sort_date({"publicationDate": "2026-08", "addedDate": "2026-09-27"}),
            "2026-08-27",
        )
        self.assertEqual(
            server.publication_sort_date({"publicationDate": "2026", "addedDate": "2025-07-15"}),
            "2026-07-15",
        )

    def test_publication_sort_keeps_equal_dates_stable(self):
        publications = [
            {"id": "first", "publicationDate": "2026", "addedDate": "2026-08-26"},
            {"id": "second", "publicationDate": "2026", "addedDate": "2026-08-26"},
        ]
        publications.sort(key=server.publication_sort_date, reverse=True)
        self.assertEqual([publication["id"] for publication in publications], ["first", "second"])


if __name__ == "__main__":
    unittest.main()
