# npm Install-Script Approvals Design

## Problem

The Linux launcher can report that UI dependencies installed successfully and
then fail during `next build` because `sqlite3` has no native binding. npm 12
blocks dependency lifecycle scripts unless they are covered by the project's
`allowScripts` policy, but exits successfully after reporting the blocked
scripts. The manager therefore records the UI manifest hash as installed even
though native dependencies are incomplete.

The observed blocked packages are trusted dependencies already required by the
UI: `prisma`, `@prisma/client`, `@prisma/engines`, `sqlite3`, and `sharp`.

## Design

Add an `allowScripts` object to `ui/package.json`. Approve only the five known
script-bearing packages and pin every approval to the exact version currently
resolved by `ui/package-lock.json`:

- `prisma@6.3.1`
- `@prisma/client@6.3.1`
- `@prisma/engines@6.3.1`
- `sqlite3@6.0.1`
- `sharp@0.34.5`

No blanket approval will be used. Version pins ensure that a dependency update
requires an explicit review before newly downloaded lifecycle code can run.
Older npm releases will ignore the additional package metadata and retain their
existing installation behavior.

Because the manager hashes both UI manifests, changing `package.json`
invalidates the cached `ui_deps_hash`. The next update or launch will rerun
`npm install`, execute the approved scripts under npm 12, and replace the false
success state without special migration code.

## Error Handling

The existing manager behavior remains unchanged. A nonzero npm exit still
causes a warning and prevents the new manifest hash from being saved. npm 12's
successful exit after blocking unapproved scripts is handled by the manifest
policy: all currently required scripts are approved, while newly introduced
scripts remain blocked until reviewed.

The Node 20/npm 12 compatibility warning is outside this fix. It is not the
cause of the missing SQLite binding and changing runtime selection would widen
the scope unnecessarily.

## Testing

Add a focused regression test that reads `ui/package.json` and
`ui/package-lock.json`, finds installed packages marked with
`hasInstallScript`, and verifies the required packages have exact, enabled
approval entries matching their lockfile versions. This catches missing,
un-pinned, stale, or blanket approvals without running network installs.

Then perform an installation/build integration check:

1. Run the UI dependency installation with the repository manifests.
2. Confirm `require("sqlite3")` loads its native binding.
3. Confirm `npm run build` completes.
4. Confirm the install does not leave either UI manifest modified.

## Scope

This change updates npm lifecycle-script policy and its regression coverage
only. It does not upgrade Node, npm, Prisma, SQLite, Sharp, or unrelated UI
dependencies.
