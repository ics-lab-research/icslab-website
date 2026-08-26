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


if __name__ == "__main__":
    unittest.main()
