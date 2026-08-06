# ROCm GPU Detection and Job Selection Design

## Problem

The Linux environment correctly detects ROCm and PyTorch exposes the Radeon RX
7900 XTX as `cuda:0`, but the UI GPU endpoint supports only `nvidia-smi` and
macOS. On AMD systems it returns an empty GPU list and the new-job page leaves
`gpuIDs` as `null`. The jobs endpoint passes that value to Prisma, where the
required `Job.gpu_ids` field rejects it and job creation fails with HTTP 500.

This machine also exposes the Ryzen 7800X3D integrated Radeon as a second ROCm
device with 512 MiB of dedicated VRAM. It is not suitable for model training
and must not be offered in the UI.

## Architecture

### ROCm telemetry

On Linux, retain NVIDIA as the first probe. If `nvidia-smi` is unavailable,
probe `rocm-smi` and execute:

```text
rocm-smi --showproductname --showuse --showmeminfo vram --showtemp --showpower --json
```

Move ROCm JSON parsing and normalization into a focused server helper so it can
be tested independently from the Next.js route. Preserve each `cardN` number as
the GPU index used by PyTorch/ROCm. Normalize AMD data into the existing
`GpuInfo` fields:

- card series becomes the display name;
- edge temperature becomes GPU temperature;
- GPU busy percentage becomes GPU utilization;
- VRAM byte values become MiB totals, used, and free;
- memory utilization is calculated from used/total VRAM;
- average or current package power becomes power draw;
- unsupported power limit, clocks, and fan values are reported as zero.

Only devices with at least 2 GiB of dedicated VRAM are returned. This excludes
the 512 MiB integrated Radeon while retaining the 24 GiB RX 7900 XTX. Indices
are not renumbered after filtering.

### API contract and presentation

Add a `backend` discriminator to the GPU response with values `nvidia`, `rocm`,
`mps`, or `null`. Keep `hasNvidiaSmi` temporarily for compatibility, but UI
components will use `backend` and the GPU list rather than interpreting every
non-NVIDIA host as GPU-less.

The monitor will display normalized AMD telemetry through the existing GPU
widget. Error text will refer generically to accelerator detection rather than
requiring NVIDIA. GPU selectors will show both the index and full device name,
for example `GPU #0 — AMD Radeon RX 7900 XTX`.

### Safe job submission

When GPU information loads, a new job continues to select the first returned
device automatically. Since filtering leaves only the trainable RX 7900 XTX on
this machine, new jobs receive `gpu_ids: "0"`.

The form must not submit while no GPU is selected. It will show an actionable
message asking the user to verify accelerator detection rather than sending a
null value.

The jobs POST endpoint provides defense in depth. macOS continues to override
the value with `mps`; all other platforms require a non-empty string and return
HTTP 400 with a clear error when it is missing. This prevents internal Prisma
validation details from becoming the user-facing failure.

## Error Handling

- Missing or failing `rocm-smi` returns backend `null`, an empty list, and a
  generic accelerator-detection error.
- Malformed ROCm JSON or cards missing required identity/memory fields are
  rejected by the parser rather than producing `NaN` telemetry.
- Individual optional AMD metrics fall back to zero so one unsupported sensor
  does not hide an otherwise usable GPU.
- No-GPU form state is explicit and cannot be persisted.
- The jobs API returns HTTP 400 for invalid `gpu_ids`; database and unexpected
  failures retain HTTP 500 handling.

## Testing

Add parser unit tests with representative two-card ROCm JSON to verify:

- the RX 7900 XTX is normalized correctly;
- byte-to-MiB and utilization calculations are correct;
- the 512 MiB integrated Radeon is excluded;
- card indices are preserved;
- optional sensor fields fall back safely;
- malformed input produces a controlled error.

Add route/form validation coverage where practical, then run TypeScript
compilation and a production build. Perform live integration checks against
this machine's `/api/gpu` endpoint: it must report backend `rocm`, exactly one
RX 7900 XTX at index 0, and current telemetry. Using mocked persistence or an
isolated test database, verify a representative job request stores
`gpu_ids: "0"`, while a missing value returns HTTP 400 without a Prisma
exception. Do not add test jobs to the user's live database.

## Scope

This change adds Linux ROCm monitoring, filters the non-trainable integrated
GPU, improves GPU labels, and prevents null GPU job submissions. It does not
change ROCm/PyTorch installation, device ordering, database schema, job worker
scheduling, or the existing `cuda:0` configuration convention used by PyTorch
on ROCm.
