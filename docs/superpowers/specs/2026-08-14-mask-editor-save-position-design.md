# Mask Editor Save Position Design

## Problem

Saving a mask calls the dataset page's mask-status refresh callback. The page increments `maskStatusRefreshKey`, which is also assigned as the React `key` for `DatasetMaskEditor`. React consequently unmounts and recreates the editor, resetting its internal image index to the first selected image.

## Design

Keep the editor mounted when mask-card status refreshes. Remove the changing `key` from `DatasetMaskEditor`; retain `maskStatusRefreshKey` only as the refresh signal supplied to dataset image cards. The editor's existing save-success callback and baseline update remain unchanged.

The current image, zoom, brush settings, and modal state therefore survive a successful save. Save failures continue to retain the dirty mask and display the existing error.

## Testing

Add a mounted regression test that opens the editor on a later selected image, saves its mask, invokes the parent-style status refresh, and verifies the editor still displays the same image and index. Existing dataset preset tests and the production build must remain green.

## Scope

This change does not add automatic next-image navigation, persist editor position across closing the modal, or alter mask storage/API behavior.
