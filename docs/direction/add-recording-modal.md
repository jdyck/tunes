# Add Recording modal

Make the YouTube search-result actions easier to use and support adding more than one Recording without repeatedly reopening the modal.

- Increase the size of the result-row Play and Add controls, especially for touch use.
- Adding a result must leave the modal open.
- While an add or removal is saving, replace that result's action icon with a spinner and prevent duplicate taps on it. Change to the checkmark or plus only after the request succeeds; surface a failure without falsely changing the result's state.
- Once a result has been saved, replace its Add/plus icon with a checkmark.
- The saved state must be reflected for every result already present in the current User's Recording list for the Song, not only for results saved during the current modal session.
- Tapping a checked result removes the current User's saved relationship (`user_recording_data`) and restores its plus icon, so each result acts as an add/remove toggle. A result saved during the current modal session can be unsaved immediately. Unsaving one that existed before the modal opened requires confirmation because its user-data row may already contain personal notes, ratings, or ordering. Do not delete the canonical Recording or shared provider metadata as the meaning of this toggle; orphan cleanup is separate maintenance work.

**Decided:** adding a result makes it a saved Recording for the current User immediately — one tap, no intervening metadata/MusicBrainz confirmation step. Under the target model, the action finds or creates the YouTube Item, finds or creates the Song-scoped canonical Recording associated with that item, then creates the unique User/Recording `user_recording_data` row. Enrichment (MusicBrainz matching and shared metadata edits) happens afterwards on Recording detail. The same rule applies wherever an unsaved preview is added from (e.g. the Global Player's expanded Add action — see [music-player.md](music-player.md)). The broader add-Song/add-Recording flow and its UX still need more thought; that rework must not reintroduce a confirmation step between tapping Add and the Recording appearing in the User's saved list for the Song.

Initially, identify an already-saved search result by exact `(Song, normalized YouTube video ID)` association. Do not attempt fuzzy matching across different videos or providers, and do not treat the same long video used under another Song as the same Recording. Normalize supported YouTube URL forms to the video ID so equivalent URLs are treated as the same item. Update the User's saved Recordings list for the Song immediately after either action; do not wait for the modal to close or for a full page refresh.
