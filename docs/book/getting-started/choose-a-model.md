# Choose a base model and architecture

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

Choose the architecture before tuning rank, learning rate, or steps. A LoRA belongs to the base-model family it was trained against; changing families later is a new training project, not a small configuration edit.

## Decide by task and modality

Start with the output the dataset actually supports:

- **Image generation** learns from target images and captions. This is the simplest first project.
- **Instruction or edit training** needs target images plus correctly matched control/source images. Choose it only when the desired behavior is an edit or transformation.
- **Video training** adds temporal frames, frame-rate choices, and much higher data and compute pressure. Text-to-video and image-to-video are distinct tasks.
- **Audio training** needs audio-specific captions and metadata rather than an image dataset.
- **Experimental entries** are exposed by the current UI, but their workflow may be narrower or change faster. Validate a short run before committing a large dataset.

Then choose a checkpoint whose license, language coverage, visual domain, and inference ecosystem fit the intended result. A newer or larger model is not automatically a better training target.

## Complete architecture overview

The table mirrors the 51 architecture identifiers in the book manifest and the current [model-selection source](https://github.com/ostris/ai-toolkit/blob/main/ui/src/app/jobs/new/options.tsx). “Instruction/edit” means paired source/control and target data may be required. “Experimental” is the UI grouping, not a promise that the architecture is unstable or unsupported.

| Architecture | UI family label | Primary workflow |
|---|---|---|
| `ace_step_15` | ACE-Step 1.5 | Audio |
| `ace_step_15_xl` | ACE-Step 1.5 XL | Audio |
| `anima` | Anima | Image generation |
| `boogu_image` | Boogu Image | Image generation |
| `boogu_image_edit` | Boogu Image Edit | Instruction/edit |
| `chroma` | Chroma | Image generation |
| `ernie_image` | ERNIE-Image | Image generation |
| `flex1` | Flex.1 | Image generation |
| `flex2` | Flex.2 | Image generation with control modes |
| `flux` | FLUX.1 | Image generation |
| `flux_kontext` | FLUX.1 Kontext | Instruction/edit |
| `flux2` | FLUX.2 | Image generation |
| `flux2_klein_4b` | FLUX.2 Klein 4B | Image generation with multi-control support |
| `flux2_klein_9b` | FLUX.2 Klein 9B | Image generation with multi-control support |
| `hidream` | HiDream | Image generation |
| `hidream_e1` | HiDream E1 | Instruction/edit |
| `hidream_o1` | HiDream O1 | Image generation |
| `ideogram4` | Ideogram 4 | Experimental image generation |
| `krea2` | Krea 2 Raw | Image generation |
| `krea2:o_edit` | Krea 2 Raw Edit | Experimental instruction/edit |
| `krea2:turbo` | Krea 2 Turbo | Image generation with training adapter |
| `krea2:o_edit_turbo` | Krea 2 Turbo Edit | Experimental instruction/edit with training adapter |
| `ltx2` | LTX-2 | Video with audio-capable dataset controls |
| `ltx2.3` | LTX-2.3 | Video with audio-capable dataset controls |
| `ltx2.5` | LTX-2.5 | Video with audio-capable dataset controls |
| `lumina2` | Lumina2 | Image generation |
| `mageflow` | Mage-Flow | Image generation |
| `mageflow_edit` | Mage-Flow Edit | Instruction/edit |
| `minimax_h3` | MiniMax-H3 | Video |
| `nucleus_image` | Nucleus-Image | Image generation |
| `omnigen2` | OmniGen2 | Image generation |
| `prx_pixel` | PRXPixel | Pixel-space image generation |
| `qwen_image` | Qwen-Image | Image generation |
| `qwen_image:2512` | Qwen-Image 2512 | Image generation |
| `qwen_image_edit` | Qwen-Image Edit | Instruction/edit |
| `qwen_image_edit_plus` | Qwen-Image Edit 2509 | Instruction/edit |
| `qwen_image_edit_plus:2511` | Qwen-Image Edit 2511 | Instruction/edit |
| `sd15` | Stable Diffusion 1.5 | Image generation |
| `sdxl` | Stable Diffusion XL | Image generation |
| `wan21:1b` | Wan 2.1 1.3B | Text-to-video |
| `wan21:14b` | Wan 2.1 14B | Text-to-video |
| `wan21_i2v:14b480p` | Wan 2.1 14B 480p | Image-to-video |
| `wan21_i2v:14b` | Wan 2.1 14B 720p | Image-to-video |
| `wan22_14b:t2v` | Wan 2.2 14B | Text-to-video, multistage |
| `wan22_14b_i2v` | Wan 2.2 14B I2V | Image-to-video, multistage |
| `wan22_5b` | Wan 2.2 5B TI2V | Text/image-to-video |
| `zimage` | Z-Image | Image generation |
| `zimage:deturbo` | Z-Image De-Turbo | De-distilled image generation |
| `zimage_l2p` | Z-Image L2P | Pixel-space image generation |
| `zimage:turbo` | Z-Image Turbo | Image generation with training adapter |
| `zeta_chroma` | Zeta Chroma | Experimental image generation |

The architecture identifier selects ai-toolkit's implementation and defaults; `model.name_or_path` selects the actual checkpoint. Do not combine an identifier with an unrelated checkpoint merely because both produce the same modality. Start from the UI's matching default or a checkpoint explicitly documented as compatible with that family.

## Access, licenses, and downloads

Check the host page before choosing a model. Some repositories require accepting terms or requesting access, and the UI explicitly links an access gate for several families. Other repositories can change visibility, filenames, or terms independently of ai-toolkit. Authenticate on the training machine, test that the complete checkpoint can be resolved, and record the exact model path used by the job.

Model access is not the same as usage permission. Read the checkpoint license, any upstream base-model license, and restrictions attached to training adapters or auxiliary files. Also check whether the intended LoRA may be redistributed or used commercially. Keep credentials outside configuration files and logs.

Downloads may include a transformer, VAE, one or more text encoders, and family-specific extras. A partially cached download is not a valid readiness test. Let a short diagnostic job reach model loading and sampling before scheduling a long run.

## Memory is a configuration question

Architecture size matters, but a single “required VRAM” number would be misleading. Peak memory also changes with checkpoint precision, model and text-encoder quantization, resolution, batch size, gradient accumulation, frame count, gradient checkpointing, layer offloading, latent caching, sampling, optimizer choice, and software versions.

Treat every estimate as a starting hypothesis. Run a small representative batch, include an actual sample pass, observe peak allocation, and leave headroom. A setting that fits one image may fail on a larger resolution bucket. A training step that fits may still fail during sampling. Low-memory and quantized configurations trade speed, accuracy, compatibility, or all three; they do not create a universal guarantee.

For a first image LoRA, use the validated Flex example and its conservative batch settings. For large image, edit, video, or audio families, use a focused guide and a diagnostic run before scaling dataset size or duration.

## Focused family guides

These chapters connect the broad selection table to family-specific behavior:

- [Anima](../models/anima.md)
- [FLUX and Flex](../models/flux-and-flex.md)
- [Qwen Image and Qwen Image Edit](../models/qwen-image-and-edit.md)
- [SDXL and Stable Diffusion 1.5](../models/sdxl-and-sd15.md)
- [Wan video models](../models/wan.md)

If the chosen family does not have a focused chapter, use this overview with the [exhaustive model and job settings reference](../reference/job-and-model.md), the UI defaults for that exact identifier, and a short diagnostic run. Continue to the [first LoRA walkthrough](first-lora.md) only after the checkpoint downloads successfully and the modality matches the dataset.

<!-- book-verification:start -->
<!-- book-verification:end -->
