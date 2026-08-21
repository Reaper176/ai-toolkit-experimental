# Triton HIP Rounding Compatibility

## Problem

ConvRot quantization kernels call `libdevice.rint` to match PyTorch's
round-to-nearest-even behavior. Triton 3.5.1's HIP backend does not expose
`rint`, so the kernel fails to compile when Qwen3-VL captioning first executes a
ConvRot-quantized vision layer on an AMD GPU.

## Design

Replace ConvRot's uses of `libdevice.rint` with `libdevice.nearbyint`.
Triton's CUDA and HIP backends both expose `nearbyint`, and it retains the
required round-to-nearest-even behavior. Quantization scales, clipping ranges,
integer conversion, and non-Triton fallback behavior remain unchanged.

Apply the replacement consistently to every ConvRot Triton kernel so other
quantization modes do not encounter the same HIP compilation failure later.

## Verification

Add a focused source-level compatibility test that fails while any ConvRot
kernel depends on `libdevice.rint` and confirms it uses the cross-backend
primitive. Run the test before and after the implementation. Also compile the
Python module and inspect the final diff. If a usable AMD GPU is available, run
the fused activation-quantization path as an integration check.

## Scope

This change does not alter captioning configuration or silently disable
quantization. It addresses only the unsupported Triton rounding symbol.
