import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
CONVROT_SOURCE = REPO_ROOT / "toolkit" / "util" / "convrot_quant.py"


class ConvRotTritonCompatibilityTest(unittest.TestCase):
    def test_kernels_use_cross_backend_round_to_even_primitive(self):
        source = CONVROT_SOURCE.read_text()

        self.assertNotIn("libdevice.rint(", source)
        self.assertEqual(source.count("libdevice.nearbyint("), 6)


if __name__ == "__main__":
    unittest.main()
