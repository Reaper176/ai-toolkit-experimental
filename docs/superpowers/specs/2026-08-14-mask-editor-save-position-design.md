# Mask Editor Save Position and Direct Launch Design

## Problem

Saving a mask calls the dataset page's mask-status refresh callback. The page increments `maskStatusRefreshKey`, which is also assigned as the React `key` for `DatasetMaskEditor`. React consequently unmounts and recreates the editor, resetting its internal image index to the first selected image.

## Design

Keep the editor mounted when mask-card status refreshes. Remove the changing `key` from `DatasetMaskEditor`; retain `maskStatusRefreshKey` only as the refresh signal supplied to dataset image cards. The editor's existing save-success callback and baseline update remain unchanged.

The current image, zoom, brush settings, and modal state therefore survive a successful save. Save failures continue to retain the dirty mask and display the existing error.

## Direct Badge Launch

The mask-status area on every dataset image card becomes an accessible button. Clicking or keyboard-activating it records that image's relative path and opens the mask editor focused on that entry.

Live image badges open the editable live-mask workflow. Archived image badges open the same modal in immutable read-only mode, using the frozen media and frozen mask URLs already derived from the selected preset version. The button label describes whether it will edit or preview the image's mask.

The dataset page passes the requested relative path through a new initial-image prop. The editor resolves the path against its current ordered image list when a badge launch occurs. It does not reorder the selection and does not move the active image when a mask-status refresh occurs.

## Testing

Add mounted regression tests that:

- open the editor on a later selected image, save its mask, invoke the parent-style status refresh, and verify the editor still displays the same image and index;
- activate a live mask badge with mouse and keyboard and open editable mode on that image;
- activate an archived badge and open immutable read-only preview on that image; and
- verify badge refreshes do not remount or reposition an open editor.

Existing dataset preset tests and the production build must remain green.

## Scope

This change does not add automatic next-image navigation, persist editor position across unrelated modal sessions, reorder selected images, or alter mask storage/API behavior.
