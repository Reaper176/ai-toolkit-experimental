# Dataset Review Selected Filter Design

## Goal

Remove the unintended gap above the dataset preset controls and add a view-only “Show only selected” filter to dataset selection mode.

## Layout

`TopBar` is 3rem tall (`h-12`), while `MainContent` normally reserves 3.5rem (`pt-14`). That extra 0.5rem becomes a visible gap above the preset controls when selection mode is active.

The dataset page will pass `pt-12` to `MainContent` while selection mode is active. This makes the sticky preset panel begin directly below `TopBar` and leaves the existing `pt-14` spacing unchanged during ordinary dataset browsing. The preset panel remains sticky at `top-12`.

## Selected-Only Filter

`DatasetSelectionToolbar` will receive controlled filter state and an `onShowOnlySelectedChange` callback. It will render an accessible checkbox or switch labeled “Show only selected” near the selection status and bulk controls.

The dataset page will own the boolean state. The filter is available only in selection mode and resets to off when selection mode closes. Loading another preset or preset version without leaving selection mode does not reset the filter.

When the filter is off, the current image grid and missing-source list are unchanged. When it is on:

- the virtualized image grid contains only live images whose normalized relative paths are in `selectedPaths`;
- the missing-source section contains only missing paths that remain selected;
- deselecting a visible live or missing item removes it from the filtered view immediately;
- an empty filtered result renders a concise message explaining that no selected images are visible.

The filtered live-image list will be memoized from `imgList`, `selectedPaths`, and the filter state. `VirtuosoGrid` will use that same list for `totalCount`, item lookup, and item keys so virtualization cannot index the unfiltered list accidentally.

## Selection Semantics

The filter changes presentation only. Existing selection behavior remains authoritative over the complete dataset:

- the status continues to report selected count against the full live-plus-missing total;
- “Select all,” “Select none,” and “Invert selection” continue to operate on every live and missing source path;
- dirty-state comparison, preset saving, retained paths, and newly selected paths continue to use the full `selectedPaths` set;
- archived/read-only and saving locks continue to affect selection mutation exactly as they do now;
- the view filter itself may still be toggled because it does not mutate preset selection.

## Components and Boundaries

- `ui/src/app/datasets/[datasetName]/page.tsx` owns filter state, derives visible live and missing lists, selects the correct content top padding, and renders the empty-filter message.
- `ui/src/components/DatasetSelectionToolbar.tsx` presents the controlled toggle without owning filtering behavior.
- `ui/src/helpers/datasetSelection.ts` may expose a small pure filtering helper if doing so produces clearer unit tests; it must not acquire React or page-specific dependencies.
- Existing dataset preset APIs, manifests, database schema, and server routes remain unchanged.

## Verification

Tests will demonstrate that:

1. the toolbar renders an accessible controlled “Show only selected” toggle and reports changes;
2. filtering returns only selected live images while preserving full-dataset action inputs;
3. only selected missing paths remain visible under the filter;
4. deselection produces an empty filtered result without changing selection semantics;
5. selection mode applies `pt-12` and the preset panel remains at `top-12`;
6. exiting selection mode resets the filter;
7. existing dataset preset selection tests remain green.

Run the focused dataset preset suite, TypeScript/build validation, and inspect the dataset review page in the running UI at desktop and narrow widths.
