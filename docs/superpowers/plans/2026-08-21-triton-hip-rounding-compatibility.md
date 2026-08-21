# Triton HIP Rounding Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every ConvRot Triton quantization kernel compile on Triton's HIP backend while preserving round-to-nearest-even quantization.

**Architecture:** Keep the existing kernels and custom-op boundaries intact. Replace the CUDA-only `libdevice.rint` spelling with `libdevice.nearbyint`, which is exposed by both CUDA and HIP Triton libdevice modules and has the required rounding semantics; guard the compatibility requirement with a lightweight source-level regression test that runs without GPU hardware.

**Tech Stack:** Python 3.12, `unittest`, PyTorch, Triton CUDA/HIP libdevice

---

## File Structure

- Create `testing/test_convrot_triton_compatibility.py`: verifies that ConvRot kernels do not reference the HIP-unsupported symbol and consistently use the cross-backend replacement.
- Modify `toolkit/util/convrot_quant.py`: updates only the six ConvRot Triton rounding calls and the explanatory comment.

### Task 1: Add the HIP compatibility regression test

**Files:**
- Create: `testing/test_convrot_triton_compatibility.py`
- Test: `testing/test_convrot_triton_compatibility.py`

- [ ] **Step 1: Write the failing test**

```python
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
```

- [ ] **Step 2: Run the test to verify it fails for the unsupported symbol**

Run: `.venv/bin/python -m unittest testing.test_convrot_triton_compatibility -v`

Expected: FAIL because `toolkit/util/convrot_quant.py` still contains six `libdevice.rint(` calls and no `libdevice.nearbyint(` calls.

- [ ] **Step 3: Commit the failing regression test**

```bash
git add testing/test_convrot_triton_compatibility.py
git commit -m "test: cover Triton HIP ConvRot rounding compatibility"
```

### Task 2: Use the cross-backend rounding primitive

**Files:**
- Modify: `toolkit/util/convrot_quant.py:871-872`
- Modify: `toolkit/util/convrot_quant.py:1726`
- Modify: `toolkit/util/convrot_quant.py:1767`
- Modify: `toolkit/util/convrot_quant.py:1888`
- Modify: `toolkit/util/convrot_quant.py:1995-2007`
- Test: `testing/test_convrot_triton_compatibility.py`

- [ ] **Step 1: Replace each unsupported call**

Change all six kernel expressions from:

```python
libdevice.rint(value)
```

to:

```python
libdevice.nearbyint(value)
```

At the activation quantization kernel, update the adjacent comment to:

```python
# nearbyint = round-half-to-even, matching torch.round in the reference path;
# unlike rint, Triton's HIP and CUDA libdevice backends both expose it
```

- [ ] **Step 2: Run the focused test to verify it passes**

Run: `.venv/bin/python -m unittest testing.test_convrot_triton_compatibility -v`

Expected: one test reports `ok` and the command exits successfully.

- [ ] **Step 3: Verify Python syntax**

Run: `.venv/bin/python -m py_compile toolkit/util/convrot_quant.py testing/test_convrot_triton_compatibility.py`

Expected: no output and exit status 0.

- [ ] **Step 4: Verify the installed Triton backends expose the selected primitive**

Run:

```bash
.venv/bin/python -c "from triton.language.extra.cuda import libdevice as cuda; from triton.language.extra.hip import libdevice as hip; assert hasattr(cuda, 'nearbyint'); assert hasattr(hip, 'nearbyint')"
```

Expected: no output and exit status 0.

- [ ] **Step 5: Run the focused nearby quantization tests**

Run: `.venv/bin/python scripts/test_quantizations.py --help`

Expected: the script starts successfully and prints its supported command-line usage. If it has no selective CPU-safe mode, record that full numerical integration requires compatible GPU hardware and do not launch the full model suite.

- [ ] **Step 6: Inspect the scoped diff**

Run: `git diff --check && git diff -- toolkit/util/convrot_quant.py testing/test_convrot_triton_compatibility.py`

Expected: no whitespace errors; the diff contains only the regression test, six primitive replacements, and the explanatory comment update.

- [ ] **Step 7: Commit the implementation**

```bash
git add toolkit/util/convrot_quant.py
git commit -m "fix: support ConvRot rounding on Triton HIP"
```
