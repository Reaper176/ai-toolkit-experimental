# MiniMax Caption Startup Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the startup `ReferenceError` by restoring the omitted MiniMax still-image caption prompt with regression coverage.

**Architecture:** Keep the existing caption-option data model unchanged. Extend its current import-level test to assert the MiniMax image preset contract, then restore the exact constant lost during merge conflict resolution.

**Tech Stack:** TypeScript, Node.js `assert`, project TypeScript compiler, Next.js 15

---

## File Structure

- Modify `ui/testing/dinov3TaggerOptions.test.ts`: extend the existing real-module import test with the MiniMax image prompt contract.
- Modify `ui/src/helpers/captionOptions.ts`: restore the missing `minimaxImageCaptionPrompt` constant next to the related video prompt.

### Task 1: Add the regression test and restore the missing prompt

**Files:**
- Test: `ui/testing/dinov3TaggerOptions.test.ts`
- Modify: `ui/src/helpers/captionOptions.ts:55-74`

- [ ] **Step 1: Write the failing regression assertion**

Add this block after the existing `DINOv3TaggerCaptioner` assertions in
`ui/testing/dinov3TaggerOptions.test.ts`:

```ts
const omniOption = captionerTypes.find(value => value.name === 'Qwen3OmniCaptioner');
assert.ok(omniOption);
const minimaxImagePrompt = omniOption.captionPrompts?.['MiniMax H4 Image'];
assert.equal(typeof minimaxImagePrompt, 'string');
assert.ok(minimaxImagePrompt.length > 0);
assert.match(minimaxImagePrompt, /^Caption this image as a MiniMax training prompt/);
assert.match(minimaxImagePrompt, /overall_soundscape: N\/A/);
assert.match(minimaxImagePrompt, /non_diegetic_music: N\/A/);
```

- [ ] **Step 2: Run the targeted test and verify the reproduced failure**

Run:

```bash
cd ui
npm run test:dinov3-tagger-captioner
```

Expected: FAIL while importing `captionOptions.ts` with
`ReferenceError: minimaxImageCaptionPrompt is not defined`. This confirms the
test exercises the startup failure rather than an unrelated condition.

- [ ] **Step 3: Restore the exact missing prompt definition**

Insert this constant immediately after `minimaxT2VCaptionPrompt` and before
`defaultIdeogramCaptionPrompt` in `ui/src/helpers/captionOptions.ts`:

```ts
// The T2VA format applied to a still image: one static [Shot 1], no timeline,
// no audio fields beyond the required N/A placeholders.
const minimaxImageCaptionPrompt = `Caption this image as a MiniMax training prompt for a single still frame. Output exactly three fields in this order, each starting on its own line with these exact field names:

integrated_multimodal_description: [Shot 1] ...

overall_soundscape: N/A

non_diegetic_music: N/A

Rules for integrated_multimodal_description: Write a single [Shot 1] with no timestamp, no cuts, and no camera motion - the camera holds a static shot on a still frame. State the overall visual style first (Live-action, cinematic, 2D-animated, 3D CG, claymation, watercolor, or vintage film) and the framing (extreme wide shot, wide shot, medium shot, medium close-up, close-up, or extreme close-up, plus the viewpoint). Then describe everything visible decisively and specifically: subject appearance, pose, and position; clothing, colors, and materials; the scene, lighting, and key props; and the spatial relationships between them. There is no motion, no dialogue, and no sound - do not invent any. Put any legible text in the image (signs, labels, packaging) in double quotation marks verbatim without translating it.

overall_soundscape and non_diegetic_music are always exactly N/A for a still image.

Describe only what is actually visible. Be decisive. No preamble and no extra text - output only the three fields.`;
```

- [ ] **Step 4: Rerun the targeted test and verify it passes**

Run:

```bash
cd ui
npm run test:dinov3-tagger-captioner
```

Expected: PASS, including `DINOv3 tagger option tests passed`, with no
`minimaxImageCaptionPrompt` reference error.

- [ ] **Step 5: Commit the focused fix**

```bash
git add ui/testing/dinov3TaggerOptions.test.ts ui/src/helpers/captionOptions.ts
git commit -m "fix: restore MiniMax image caption prompt"
```

### Task 2: Verify the production startup path

**Files:**
- Verify only; no additional file changes.

- [ ] **Step 1: Build the production UI**

Run:

```bash
cd ui
npm run build
```

Expected: exit code 0. Existing optional-platform warnings may remain, but the
build must not report `minimaxImageCaptionPrompt` as undefined.

- [ ] **Step 2: Launch the UI through the manager**

Run from the repository root:

```bash
python3 -m manager launch --no-browser
```

Expected: the worker starts and Next.js reports `Ready`; startup output does not
contain `ReferenceError: minimaxImageCaptionPrompt is not defined`. Stop the
process with Ctrl-C after verification.

- [ ] **Step 3: Confirm the patch is isolated**

Run:

```bash
git status --short
git show --stat --oneline HEAD
```

Expected: the fix commit contains only the caption-options source and its test.
Pre-existing unrelated worktree changes remain untouched.

