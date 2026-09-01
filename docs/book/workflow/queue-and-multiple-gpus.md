# Understand queues and multiple GPUs

[Table of contents](../README.md)

<!-- book-navigation:start -->
<!-- book-navigation:end -->

The UI queue is a scheduler for job processes. Its identity and exclusion boundary are the stored `gpu_ids` string, not a normalized set of physical devices. Understanding that distinction prevents accidental overlap and incorrect expectations about multi-GPU training.

## Queue identity is the exact gpu_ids key

Each job stores a `gpu_ids` value such as `"0"`, `"1"`, or `"0,1"`. Queue records are uniquely keyed by that exact string. The queue worker compares jobs and queues using exact equality.

Therefore these are different queue keys:

| Key | Scheduler interpretation |
|---|---|
| `"0"` | One queue whose jobs are configured with exactly GPU 0 |
| `"1"` | A separate queue whose jobs are configured with exactly GPU 1 |
| `"0,1"` | A separate queue whose jobs carry the ordered string 0,1 |
| `"1,0"` | Another separate queue; it is not normalized to 0,1 |

Whitespace or differently written lists should not be treated as aliases. Use the GPU selector rather than hand-writing queue keys, keep one canonical ordering, and verify the displayed GPUs before starting.

The exact-key design also means the scheduler does not infer that `"0"` overlaps `"0,1"`. Those queues can be considered independently even though both mention physical GPU 0. Avoid creating overlapping keys unless you have separately arranged safe resource sharing.

## One queue runs one job process at a time

When a queue is running, the worker first looks for a job with status `running` or `stopping` and the same exact `gpu_ids`. If one exists, it does not start another job for that queue. Otherwise it selects the earliest queued job for the key and starts one process.

When no queued job remains, that queue changes to stopped. Adding a job later does not imply that an empty stopped queue will start itself; use the queue start control or a job view that explicitly starts its queue.

The statuses have different meanings:

- `queued`: eligible to be selected by the matching running queue;
- `running`: the worker has launched the job process;
- `stopping`: shutdown has been requested and cleanup may still be occurring;
- `stopped`: no longer eligible until deliberately queued again;
- `completed`: the job reported completion;
- `error`: startup or execution reported a failure.

Database status is useful scheduler state, but the log, process ID, GPU activity, and output files provide additional evidence. A status transition is not proof that a checkpoint write completed.

## Start, stop, and return jobs deliberately

The play control on a stopped, completed, or error job performs queue preflight, moves that job to `queued`, and creates its exact queue record if necessary. Starting the queue allows its next eligible job to run.

Stopping an individual running job sets its stop request and attempts a graceful interrupt. Wait for the process and log to finish cleanup. To remove a job that is merely queued, use the remove control; this marks it stopped without launching it.

Stopping an entire queue has a different purpose. The queue becomes non-running. A running job with the same exact key is asked to **return to queue**: the trainer observes the return flag, changes its status back to `queued`, and exits at a supported check point. After it has actually exited, the queue remains stopped until restarted.

Use this planned-pause sequence:

1. request **Save Next Step** if a fresh checkpoint is needed and wait for it;
2. stop the exact queue;
3. watch the active job move through shutdown and return to queue;
4. confirm no matching process is still active;
5. perform maintenance or free the device;
6. restart the same queue when ready.

Do not edit a returned job while its old process is still exiting. If configuration must change, stop it fully, preserve the current state, clone or edit, and then queue the intended revision.

## Use multiple GPUs for independent jobs

To use two GPUs concurrently, create separate jobs with non-overlapping canonical keys such as `"0"` and `"1"`, then start both queues. The result is independent single-process jobs: each has its own model load, dataset, optimizer, logs, checkpoints, and failure state.

This is useful for controlled comparisons when each GPU can hold its assigned job. Keep job names and output folders distinct, use the same evaluation suite when comparing settings, and account for differences between GPU models or thermal conditions.

The UI does not provide distributed multi-GPU training for one LoRA job. Writing `"0,1"` does not establish data parallelism, gradient synchronization, or a shared distributed optimizer. It is a job/queue device string passed to one process, and support for how that process uses the selection must not be inferred from the number of IDs.

For one experiment that truly requires distributed training, use a separately documented and verified distributed launch path if the selected trainer supports it. Do not describe two independent jobs as one distributed run.

## Recover from a hung or stale job

First distinguish a slow operation from a dead process. Model downloads, cache construction, large samples, and checkpoint serialization can leave training-step counters unchanged while work continues. Check the latest log timestamp, GPU utilization, disk activity, process ID, free space, and system errors.

If a process is alive, use the normal stop control once and allow its graceful shutdown window. Repeated stop/start clicks can obscure the state. On supported platforms the UI sends or arranges an interrupt and includes a backstop for a process that does not exit normally.

Use **Mark as Stopped** only after independently confirming that the process is gone. That control repairs database state; it does not stop a process. Marking a live job stopped can let another process start on the same exact queue and corrupt assumptions about device and output ownership.

After recovery:

- preserve the last complete log and checkpoint/sample pair;
- remove or quarantine a partial artifact;
- verify the job status, PID, and queue state;
- diagnose the cause before requeueing;
- read the resume chapter before attaching earlier optimizer state.

If the queue record is stopped with a valid queued job, start that exact queue. If a queue mutation reports a conflict or preflight error, refresh the job and correct the current revision rather than repeatedly submitting a stale page.

## Know the concurrency limits

The UI enforces one active process per exact queue key. It does not provide global exclusion across differently written queue keys. In particular, `"0"`, `"0,1"`, and `"1,0"` are independent scheduler records and can overlap physical devices.

Before starting multiple queues, make a device map and require that active keys are disjoint. Include non-training GPU consumers such as inference servers, desktop rendering, and another ai-toolkit instance. The safest policy is one canonical single-GPU key per concurrent job unless a specific workflow has been tested under a different arrangement.

Queue separation also does not coordinate disk bandwidth, system RAM, CPU workers, model caches, or output directories. Independent jobs can still contend for those shared resources. Monitor the whole host, not only VRAM.

See [saving and resume behavior](saving-resuming-and-optimizer-state.md) before restarting interrupted work, and consult the [job/model reference](../reference/job-and-model.md) for the exact `gpu_ids` configuration boundary.

<!-- book-verification:start -->
<!-- book-verification:end -->
