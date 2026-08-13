# ROCm Clock and Fan Telemetry Design

## Problem

The GPU widget always displays `0 MHz` and `0%` for AMD GPUs because the ROCm normalizer hardcodes clock and fan values to zero. The existing ROCm command does not request the metrics that this machine's ROCm SMI exposes.

## Design

Extend the existing `rocm-smi` JSON query with `--showmetrics`. Normalize `current_gfxclk (MHz)` as the graphics clock and `current_uclk (MHz)` as the memory clock. Normalize `current_fan_speed (rpm)` as fan speed. Missing, `N/A`, or malformed optional metrics continue to fall back to zero so telemetry gaps never hide an otherwise trainable GPU.

Add an optional fan unit to the shared GPU contract. ROCm and macOS report `RPM`; NVIDIA continues to report `%`. The widget renders the supplied unit and defaults to `%` for backward compatibility.

The polling and five-second server cache remain unchanged.

## Error Handling

- Do not use ROCm's legacy `--showfan`; it fails with `map::at` on the current driver.
- Treat absent or nonnumeric metrics as zero.
- Preserve the existing GPU identity, VRAM filtering, temperature, utilization, and power behavior.

## Testing

- Extend the ROCm parser fixture with realistic metrics and assert both clock values and fan RPM.
- Assert sparse ROCm data still produces zero-valued telemetry without failing detection.
- Cover fan-unit rendering for RPM and the legacy percentage fallback.
- Run ROCm tests, relevant UI tests, TypeScript/build validation, and a live read against this machine.

