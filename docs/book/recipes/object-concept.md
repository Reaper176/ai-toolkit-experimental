# Recipe: object and product concept LoRA

[Table of contents](../README.md)

<!-- book-navigation:start -->
[← Previous](style.md) · [Next →](focused-refinement.md)
<!-- book-navigation:end -->

Use this recipe to teach a specific object, product, prop, or designed concept while preserving control over scene, viewpoint, lighting, and presentation. Treat every range as an experiment boundary and verify the result with held-out prompts.

<!-- built-in-presets:start -->
- `builtin:flex1:object-general-concept@1` — Flex.1 — Object / General Concept
- `builtin:qwen_image:object-general-concept@1` — Qwen Image — Object / General Concept
<!-- built-in-presets:end -->

## Objective

Teach the object's recognizable shape, parts, proportions, markings, and material behavior without binding it to one photograph or studio setup. A successful LoRA recalls the concept from a consistent trigger and places it plausibly in new scenes.

Decide before curation whether variable attributes belong to the identity. Colorways, accessories, packaging, damage, opened/closed state, and redesigns should be either represented and captioned as controllable variations or excluded from the first baseline.

## Suitable models

Use an image model that already understands the object's broad category and intended output mode. This baseline targets the supported FLUX/Flex and Qwen Image/Edit paths listed under model-specific deviations. The family guide determines compatible architecture, precision, optimizer, scheduler, and edit-conditioning choices.

An edit model is useful when the goal includes inserting or transforming the object relative to an input image. A text-to-image baseline is still valuable because it separates concept learning from edit-input dependence.

## Dataset design

Photograph or select the object across deliberate coverage axes:

- front, rear, side, three-quarter, elevated, and low viewpoint where meaningful;
- close detail, ordinary product framing, and wider contextual scale;
- multiple backgrounds, surfaces, lighting directions, and shadow conditions;
- visible functional parts and distinctive markings;
- legitimate state, accessory, color, and material variants included in scope;
- partial occlusion only after unobstructed coverage is adequate.

Preserve shape evidence: avoid heavy wide-angle distortion, unexplained reflections, aggressive background removal halos, and crops that sever defining parts. Remove exact duplicates and near-identical burst frames. If all sources use the same turntable, hand, room, or packaging, add counterexamples or accept that correlation as a documented limitation.

Ten to fifty strong images can support a diagnostic run for many simple objects, but complex articulated products may require more views. Hold out at least one viewpoint and two contexts for evaluation. Follow [dataset curation](../datasets/curation.md) and verify ownership, trademarks, private information, and intended use with [rights, privacy, and safety](../datasets/rights-privacy-and-safety.md).

## Caption pattern

Use one distinctive trigger consistently and describe controllable facts around it:

```text
[trigger], three-quarter product photo, closed, on a wooden table, soft side light
[trigger], rear view, red material variant, outdoors, overcast light
```

Caption viewpoint, state, accessory, color, material, scene, and notable occlusion when they vary. Do not repeatedly describe fixed identity details that the trigger is meant to collect. Do not call every example merely `a product`; missing context encourages the trigger to absorb backgrounds and layouts.

Begin with deterministic captions, token dropout off, random triggers off, and shuffling off for prose. Add modest caption dropout only after the baseline responds correctly. See [captions and triggers](../datasets/captions-and-triggers.md).

## Starting settings and ranges

After applying the selected family defaults, use this conservative sweep:

| Setting | Starting range | Reason to move |
|---|---:|---|
| linear LoRA rank | 16 to 64 | raise for complex geometry or fine markings that remain missing; lower when memorization or file size dominates |
| linear alpha | equal to rank | keeps initial rank comparisons straightforward |
| network learning rate | 5e-5 to 1e-4 | lower when geometry warps or prompts lose influence; raise cautiously if all checkpoints remain generic |
| optimizer steps | 1,000 to 3,000 | inspect periodic saves and stop when generalization declines |
| batch size | 1 where memory-bound | use accumulation only as a controlled, documented change |
| caption dropout | 0 to 0.05 | test after caption alignment is established |
| save/sample interval | 200 to 250 steps | makes undertraining and overfitting visible |

Start near rank 32 with matching alpha and learning rate `1e-4` when the family guide supports it. First run a short pipeline diagnostic. Do not use repetition to make a tiny set appear diverse, and do not change rank, rate, and duration together.

## Sampling plan

Prepare fixed prompts and a fixed seed before training. Hold the base model, sampler, dimensions, inference steps, and LoRA strength constant across checkpoint grids.

Include:

- familiar and held-out viewpoint prompts;
- plain studio and novel environmental scenes;
- near, medium, and distant scale;
- included color, state, or accessory variations;
- a prompt that asks for a new compatible material;
- interaction or partial occlusion where relevant;
- trigger-off prompts for the base category;
- for edit training, several input images not used in training.

Sample every 200 to 250 steps. Compare geometry, markings, material response, prompt adherence, and background independence—not just visual appeal. Confirm a promising checkpoint across multiple seeds and LoRA strengths using [sampling and evaluation](../workflow/sampling-and-evaluation.md).

## Expected learning signals

Early saves should distinguish the trigger from the generic category in familiar views. Later useful saves should preserve shape and defining parts across held-out angles and scenes. Materials should respond plausibly to light without becoming a pasted texture.

Healthy learning preserves prompt control over viewpoint, placement, background, and variable attributes. Trigger-off prompts should remain close to the base model. Multiple seeds should produce the concept rather than one lucky reconstruction.

Loss confirms optimization activity but does not score geometry or generalization. A loss valley is a checkpoint worth inspecting, not proof of the best object model.

## Common failure modes

**Missing or invented parts:** improve viewpoint and detail coverage before increasing rank. Check crops, occlusion, mislabeled variants, and whether the base model understands the category.

**Background or turntable leakage:** add environmental counterexamples, caption contexts, and remove near-duplicates. More repetitions usually reinforce leakage.

**Shape is right only from the front:** add genuine held-out-angle coverage; mirrored or synthetic crops do not replace rear and side evidence.

**Material is fused to identity:** include and caption valid material variants, or explicitly narrow the concept definition. Avoid conflicting captions for fixed versus variable traits.

**Overfitting:** later checkpoints copy framing, logos, shadows, or source imperfections and ignore novel prompts. Select an earlier save and reduce steps, repeats, learning rate, or rank in the next single-variable comparison.

**Edit results depend on one source layout:** broaden input-image structure and test text-to-image activation separately from edit conditioning.

## Settings deliberately not changed

Keep the base checkpoint, architecture, optimizer family, scheduler, timestep distribution, quantization, target modules, loss type, resolution and buckets, caches, and sampling stack at the chosen model-family baseline.

Leave masks off for the first full-image concept run. A background-confounding diagnosis may justify a separate focused-refinement experiment, but masks can also remove useful contact shadows, reflections, and context. Leave text-encoder training off unless the family guide explicitly supports it. Keep dataset weights and repeats neutral while evaluating coverage.

## Model-specific deviations

- [FLUX and Flex training guide](../models/flux-and-flex.md): preserve its architecture, scheduler, precision, quantization, and sampling defaults before narrowing the generic sweep.
- [Qwen Image and Edit training guide](../models/qwen-image-and-edit.md): choose the correct generation or edit path and retain its conditioning, caching, resolution, and memory requirements.

When a validated preset or family guide conflicts with a generic range here, the family-specific value wins.

## Further reading

- [A mental model of LoRA training](../getting-started/training-mental-model.md)
- [Dataset curation](../datasets/curation.md)
- [Captions and triggers](../datasets/captions-and-triggers.md)
- [Resolution and bucketing](../datasets/resolution-and-bucketing.md)
- [Sampling and evaluation](../workflow/sampling-and-evaluation.md)
- [Loss and checkpoints](../workflow/loss-and-checkpoints.md)

<!-- book-verification:start -->
Verified against ai-toolkit-experimental book revision 1 (2026-08-14).
<!-- book-verification:end -->
