# Songs list

The Songs-list search matches both the User's private display title and the shared Song title. Extend it to also match writer credits, so searching for a writer finds every Song credited to that Artist, including a credited group. Before the canonical Artist migration, use the existing `song_writers` data already loaded for the list; after migration, preserve the behavior against Song-to-Artist credits rather than baking the transitional person-only table into the component API. This remains a client-side filter alongside title matching, not a separate search UI.

Replace the list's text-only loading message with a skeleton that has the same row shape as a populated list: empty visual blocks in the positions of the title, writer credit, and optional metadata. It should communicate loading without the list collapsing or jumping when Songs arrive.
