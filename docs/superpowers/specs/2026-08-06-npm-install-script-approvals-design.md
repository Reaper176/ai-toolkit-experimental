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
invalidates the cached `ui_deps_hash` and causes the next update or launch to
rerun `npm install`. However, npm considers an existing dependency tree current
even when a lifecycle script was blocked during its original installation. It
does not retroactively execute that script after an approval is added.

The manager will therefore validate SQLite before accepting either a cached or
newly installed dependency tree. It will run Node with `require("sqlite3")` in
the UI directory. A successful load preserves the current fast path. A failed
load causes the normal incremental `npm install` followed by a targeted
`npm rebuild sqlite3`, then a second load check. The manager records the
`ui_deps_hash` only after the binding loads successfully. This repairs existing
broken installations without rebuilding healthy installations or every native
dependency.

## Error Handling

A nonzero npm install or SQLite rebuild exit causes a warning and prevents the
new manifest hash from being saved. The same is true if SQLite still cannot be
loaded after a successful rebuild command. A cached dependency tree is treated
as ready only when its manifest hash matches and the binding load succeeds.

npm 12's successful exit after blocking unapproved scripts is handled in two
layers: the manifest approves all currently required scripts while newly
introduced scripts remain blocked until reviewed, and runtime validation keeps
the manager from treating an incomplete SQLite installation as ready.

The Node 20/npm 12 compatibility warning is outside this fix. It is not the
cause of the missing SQLite binding and changing runtime selection would widen
the scope unnecessarily.

## Testing

Add a focused regression test that reads `ui/package.json` and
`ui/package-lock.json`, finds installed packages marked with
`hasInstallScript`, and verifies the required packages have exact, enabled
approval entries matching their lockfile versions. This catches missing,
un-pinned, stale, or blanket approvals without running network installs.

Add manager unit coverage using mocked subprocess results for these paths:

- a valid cached dependency tree remains a no-op;
- a cached tree with a missing SQLite binding does not take the fast path;
- a missing binding triggers only `npm rebuild sqlite3` after installation;
- a successful rebuild is revalidated before the hash is saved;
- a failed rebuild or second load check does not save the hash.

Then perform an installation/build integration check:

1. Run the manager-owned UI dependency installation with the repository
   manifests and a deliberately absent SQLite binding when reproducing the
   recovery path.
2. Confirm the targeted rebuild makes `require("sqlite3")` load successfully.
3. Confirm `npm run build` completes.
4. Confirm the install does not leave either UI manifest modified.

## Scope

This change updates npm lifecycle-script policy, adds targeted SQLite binding
validation/recovery to the existing UI dependency manager, and adds regression
coverage for both. It does not upgrade Node, npm, Prisma, SQLite, Sharp, or
unrelated UI dependencies.
