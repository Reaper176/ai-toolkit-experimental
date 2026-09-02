# Training Preset Details Popover Design

Date: 2026-09-01

## Context

The New Training Job toolbar renders `TrainingPresetDetails` inline with the training-preset selector. Selecting a built-in preset expands prerequisites, warnings, evidence, and the recipe link inside the toolbar. That content can overlap the preset dropdown and prevent the user from changing selections.

## Goal

Keep the preset dropdown permanently reachable while retaining the built-in preset guidance in an accessible, responsive details popover.

## Non-goals

- Change preset catalog contents, filtering, application, or persistence.
- Change user-created preset actions.
- Change recipe URLs or training configuration behavior.
- Introduce a general-purpose popover framework.

## Component design

`TrainingPresetControl` continues to own preset loading, selection, application, and the selected built-in record. It gains local open/closed state for the details card.

The toolbar renders three sibling elements inside a relatively positioned wrapper:

1. The existing `TrainingPresetSelect`.
2. A compact `Details` toggle, present only when a compatible built-in preset is selected.
3. A viewport-fixed details card below the toolbar, containing the existing `TrainingPresetDetails` component.

The details card does not participate in toolbar layout, so its content cannot resize or cover the preset selector. Viewport-fixed positioning also keeps it outside the fixed-height `TopBar`'s overflow clipping geometry while retaining horizontal toolbar scrolling. It aligns to the toolbar edge, resets the toolbar's inherited non-wrapping text style, and uses a bounded responsive width, maximum viewport-relative height, and vertical scrolling for long content.

## Interaction behavior

- Selecting a built-in preset shows the `Details` toggle but does not force the card open.
- Clicking `Details` toggles the card.
- While open, changing to another compatible built-in preset keeps the card open and updates its contents.
- Selecting a user preset, clearing an incompatible selection, or otherwise removing the selected built-in closes and hides the card.
- Clicking outside the control or pressing `Escape` closes the card.
- Closing the card never changes or undoes the selected preset.

## Accessibility

- The toggle is a real button with `aria-expanded` and `aria-controls`.
- The card has a stable owned ID and a labelled non-modal region.
- Keyboard focus remains on the toggle when opening; the card contains ordinarily focusable links.
- `Escape` closes the card without changing selection.
- Outside-click handling must not intercept interaction with the preset selector or the card itself.

## Responsive layout

- The dropdown remains at its existing toolbar width.
- The card is anchored below the control and kept within the viewport using a constrained width.
- Long prerequisite or warning content scrolls within the card rather than expanding the toolbar or viewport indefinitely.
- The layout must remain usable at the existing small-screen toolbar breakpoint.

## Error handling

Preset fetch and application errors retain their existing behavior. The details toggle is unavailable while the control is disabled, loading, pending, or has no selected built-in. Closing the details card has no network or persistence effects.

## Testing

Component tests will prove:

- Selecting a built-in does not render details inline by default.
- The `Details` button appears only for a selected built-in.
- The button opens and closes the details region and exposes correct ARIA state.
- `Escape` and an outside pointer event close the region.
- Changing between built-ins updates an open region.
- Selecting a user preset removes the toggle and region.
- The preset selector remains rendered and enabled while details are open.

The focused training-preset UI suite, full training-preset suite, production build, and diff/cleanliness checks remain the acceptance gate.
