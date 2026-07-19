# Songs list

The Songs-list search currently matches only a Song's title. Extend it to also match its writer credits, so searching for a writer finds every Song credited to them. Use the existing `song_writers` data already loaded for the list; this is a client-side filter alongside title matching, not a separate search UI.

Replace the list's text-only loading message with a skeleton that has the same row shape as a populated list: empty visual blocks in the positions of the title, writer credit, and optional metadata. It should communicate loading without the list collapsing or jumping when Songs arrive.
