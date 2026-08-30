# MiniMax Caption Startup Fix Design

## Problem

The UI reaches its Next.js startup phase and then reports an unhandled
`ReferenceError` because `captionerTypes` references
`minimaxImageCaptionPrompt`, but the constant is not defined in
`ui/src/helpers/captionOptions.ts`. The definition existed on one parent of
merge commit `5bfddcab` and was omitted during conflict resolution.

## Scope

Restore only the omitted MiniMax still-image caption prompt. Do not change the
non-fatal npm, macOS sensor, OpenSlide, Prisma, or color warnings observed during
startup.

## Implementation

Add an import-level regression test that loads the real caption-options module
and verifies that the `Qwen3OmniCaptioner` exposes a non-empty
`MiniMax H4 Image` prompt with the expected three-field MiniMax output contract.
The current module must fail this test with the reproduced `ReferenceError`.

Then restore the exact `minimaxImageCaptionPrompt` constant from the merge
parent immediately after `minimaxT2VCaptionPrompt`. No other production behavior
or prompt text changes.

## Verification

1. Run the new regression test and observe the expected pre-fix failure.
2. Restore the missing constant and rerun the test successfully.
3. Run the relevant captioner tests and the UI production build.
4. Launch the UI and confirm it reaches Ready without
   `ReferenceError: minimaxImageCaptionPrompt is not defined`.

