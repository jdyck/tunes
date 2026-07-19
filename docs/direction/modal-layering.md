# Modal layering

Modal dialogs are the application's top interactive layer. When a modal is open, its backdrop must dim the entire interface, including the Global Player; the modal content sits above that backdrop.

The intended stack, from highest to lowest, is:

1. Modal content and its backdrop
2. Global Player (including expanded cover art/video)
3. Browse panes and their detail overlays

Set shared z-index/layer tokens or otherwise make this hierarchy explicit rather than adjusting individual components until a particular modal happens to appear correctly. The current player/modal ordering conflicts with this rule and needs changing when this work is taken up.
