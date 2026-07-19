# Add Recording modal

Make the YouTube search-result actions easier to use and support adding more than one Recording without repeatedly reopening the modal.

- Increase the size of the result-row Play and Add controls, especially for touch use.
- Adding a result must leave the modal open.
- While an add or removal is saving, replace that result's action icon with a spinner and prevent duplicate taps on it. Change to the checkmark or plus only after the request succeeds; surface a failure without falsely changing the result's state.
- Once a result has been added, replace its Add/plus icon with a checkmark.
- The added state must be reflected for every result already present in the Song's Recording list, not only for results added during the current modal session.
- Tapping a checked result removes that Recording and restores its plus icon, so each result acts as an add/remove toggle. A Recording added during the current modal session can be removed immediately. Removing a Recording that existed before the modal opened requires confirmation because it may already contain personal notes, ratings, or edited metadata.

**Decided:** adding a result attaches the Recording to the Song immediately — one tap, no intervening metadata/MusicBrainz confirmation step. Enrichment (MusicBrainz matching, metadata edits) happens afterwards on Recording detail. The same rule applies wherever an unsaved preview is added from (e.g. the Global Player's expanded Add action — see [music-player.md](music-player.md)). The broader add-Song/add-Recording flow and its UX still need more thought; that rework must not reintroduce a confirmation step between tapping Add and the Recording existing on the Song.

Initially, identify an already-added search result by its exact normalized YouTube video ID. Do not attempt fuzzy matching across different videos or providers. Normalize supported YouTube URL forms to the video ID so equivalent URLs are treated as the same result. Update the Song's recordings list immediately after either action; do not wait for the modal to close or for a full page refresh.
