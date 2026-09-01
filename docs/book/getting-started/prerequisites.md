# LoRA training prerequisites

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

This chapter is the preflight check. Complete it before creating a job so a model download, full disk, inaccessible dataset, or exposed UI does not interrupt the first run.

## Install and start ai-toolkit

Use the repository manager when possible. It selects the appropriate PyTorch build, creates the Python environment, installs dependencies, and starts the UI:

```bash
python3 -m manager install
python3 -m manager launch
```

Use `python3 -m manager doctor` when setup fails. Manual installation remains available, but it makes you responsible for choosing a compatible Python, PyTorch, CUDA, and dependency combination. Follow the [current installation source](https://github.com/ostris/ai-toolkit#installation) rather than copying old commands from a training post.

After launch, open the address printed by the manager. A source installation commonly serves the UI at `http://localhost:8675`. Confirm that the jobs page loads before downloading a large model or preparing a long run.

If the UI is reachable from another computer or an untrusted network, set a strong `AI_TOOLKIT_AUTH` value before launch and restrict access with the host firewall or a trusted reverse proxy. Treat the token like a password. Localhost-only access is the safest starting point.

## Authentication and model access

Many base models are downloaded from Hugging Face. Create a read token, accept any model-specific license or access agreement, and authenticate on the machine that will run training. Never place the token in a YAML file, caption, screenshot, or shared log.

Before starting a job, open the selected model page while signed in and confirm that your account can access its files. Authentication does not grant permission to ignore the model license; review its allowed uses separately. The [model selection chapter](choose-a-model.md) explains architecture and modality choices without assuming that every account can download every model.

Remote model access and UI authentication solve different problems: the Hugging Face credential permits downloads, while `AI_TOOLKIT_AUTH` protects the local web interface. A trainer may need both.

## GPU support, memory, and storage

The standard local path assumes a supported NVIDIA GPU and a working PyTorch/CUDA environment. Run the manager's diagnostic command and verify that PyTorch detects the intended device. Do not infer support merely because the desktop displays through that GPU.

Memory demand varies with architecture, resolution, frame count, batch size, quantization, caching, and sampling. There is no universal VRAM guarantee. Begin with the conservative settings in [`first-lora-flex1.yaml`](../examples/first-lora-flex1.yaml), then reduce resolution or use a model-specific low-memory recipe if allocation fails. Video and large edit models can require substantially more resources than a basic image LoRA.

Plan disk space for all of the following:

- base-model and text-encoder downloads;
- cached latents or text embeddings;
- the curated dataset and any masks or controls;
- periodic checkpoints, optimizer state, samples, and logs;
- enough free working space for temporary files and a clean shutdown.

Place the model cache, dataset, and training output on storage that will remain mounted for the whole run. Avoid a nearly full system disk. Check the output directory after a short diagnostic run and decide how many checkpoints to retain before scaling up.

## Dataset rights, privacy, and safety

Use material that you created or have permission to use for training. A file being publicly viewable does not automatically grant training, redistribution, publicity, trademark, or commercial rights. Record where the data came from and the permission or license that covers it.

Remove private records, credentials, location data, medical information, and other sensitive material that is not essential to the intended concept. Obtain appropriate consent before training a person's identity, voice, or likeness. Check image metadata and captions as well as visible pixels. Do not use this workflow to create deceptive, abusive, exploitative, or illegal material.

Keep the original dataset separate from the cleaned training copy. That makes deletions and provenance corrections auditable. The later dataset-safety chapter expands this checklist, but uncertainty at this stage is a reason to pause and resolve the rights question, not a reason to proceed quietly.

## Readiness checklist

Before the first job, verify that:

- ai-toolkit launches and the UI is protected appropriately;
- PyTorch sees the intended supported NVIDIA GPU;
- the chosen model is accessible and its license fits the intended use;
- the dataset is backed up, curated, captioned, and covered by permission;
- model caches and the training output location have adequate free space;
- the output path is persistent and writable;
- you can identify the fixed-seed samples and checkpoints the run will create.

The next practical run uses [`first-lora-flex1.yaml`](../examples/first-lora-flex1.yaml). Read [safe saving and resume behavior](../workflow/saving-resuming-and-optimizer-state.md) before relying on a checkpoint as the only copy of ongoing work.

<!-- book-verification:start -->
<!-- book-verification:end -->
