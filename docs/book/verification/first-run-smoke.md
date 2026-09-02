# First-run supported-GPU smoke

[Table of contents](../README.md)

<!-- smoke-record:start -->
```json
{
  "schema_version": 1,
  "status": "passed",
  "book_revision": 1,
  "tested_commit": "c3779da0bea77fbba8bdf69015414d7837462f63",
  "tested_at": "2026-09-01T20:28:52Z",
  "ui_architecture": "anima",
  "model_identifier": "circlestone-labs/Anima-Base-v1.0-Diffusers",
  "hardware": {
    "gpu_model": "AMD Radeon RX 7900 XTX",
    "vram_gib": 23.98,
    "software": "CachyOS Linux kernel 7.2.2-1-cachyos; AMD ROCm driver 7.2.2; Python 3.12.11; PyTorch 2.13.0+rocm7.1 with HIP 7.1; Node 20.20.2; ai-toolkit c3779da0bea77fbba8bdf69015414d7837462f63"
  },
  "dataset": {
    "fixture_id": "task16 synthetic color cards v1; digest covers 12 generated PNGs and caption sidecars",
    "file_count": 12,
    "sha256": "866f8013ee266a51854504d80760543ddd0ba48090dc05d07be31795bc7f3b6c"
  },
  "workflow": {
    "authentication": "passed",
    "job_creation": "passed",
    "queue": "passed",
    "start": "passed",
    "fixed_seed_sample": "passed",
    "checkpoint": "passed",
    "sample_comparison": "passed",
    "stop": "passed",
    "increase_steps": "passed",
    "resume": "passed",
    "optimizer_restoration": "passed",
    "continued_step_progress": "passed"
  },
  "observations": {
    "checkpoint_step": 250,
    "configured_learning_rate": 0.0001,
    "resumed_step": 251,
    "notes": "Observed 12 images across 12 source shapes; fixed-seed step-0 and step-250 samples differed with normalized RMSE 0.51489; checkpoint and optimizer state were saved; resume loaded adapter weights with no missing keys and optimizer state, retained LR 1e-4, continued through step 251, and a later live resumed process stopped after logged step 292."
  }
}
```
<!-- smoke-record:end -->

<!-- book-navigation:start -->
[← Previous](../troubleshooting/common-failure-patterns.md) · [Next →](../examples/README.md)
<!-- book-navigation:end -->

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
