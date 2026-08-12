# Repository Fork Migration Design

## Goal

Make `https://github.com/Reaper176/ai-toolkit-experimental` the publishing and installation home for this customized checkout while preserving Ostris' repository as the upstream source and retaining appropriate attribution and dependency references.

## Git Remote Layout

- Rename the existing `origin` remote to `upstream` without changing its URL: `https://github.com/ostris/ai-toolkit.git`.
- Add `origin` with fetch and push URL `https://github.com/Reaper176/ai-toolkit-experimental.git`.
- Configure the local `main` branch to track `origin/main` after confirming that the histories have a safe relationship.
- Never force-push as part of this migration. If the local branch cannot be pushed as a fast-forward, stop and report the divergence for an explicit user decision.

## Repository Reference Policy

Update references whose purpose is to identify where users obtain or identify this customized project:

- repository metadata in `info.py`;
- README clone commands;
- notebook clone commands;
- Docker source clone instructions.

Preserve references whose purpose is attribution, upstream support context, or a separate dependency:

- “AI Toolkit by Ostris” attribution and its upstream link;
- links to issues in `ostris/ai-toolkit` that document upstream behavior;
- Modal comments describing the upstream image or deployment;
- the separate `ostris/ai-toolkit-spark-wheels` release dependency.

The project name and package/module identifiers remain unchanged. This migration changes repository ownership references, not internal APIs or branding beyond the repository URL.

## Safety and Data Preservation

- Preserve all existing commits and working-tree changes.
- Inspect both local and remote ancestry before changing branch tracking or pushing.
- Do not rewrite history, delete branches, or force-update the fork.
- Make repository content edits in a dedicated commit separate from this design-spec commit.

## Verification

The migration is complete only when:

1. `origin` resolves to the Reaper176 fork for fetch and push.
2. `upstream` resolves to Ostris' repository for fetch and push.
3. Local `main` tracks `origin/main`.
4. Ownership-facing repository references point to the fork.
5. Attribution, upstream issue references, Modal context, and the Spark wheels dependency still point to Ostris where intended.
6. Repository-wide searches show no incorrectly migrated or stale ownership-facing URLs.
7. A normal, non-force push is proven safe and succeeds, or any ancestry conflict is reported without modifying remote history.
