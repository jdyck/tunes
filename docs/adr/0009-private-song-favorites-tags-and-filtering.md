# Private Song favorites, tags, and filtering

A User's favorite status and tags are private organization on
`song_user_data`, never canonical Song metadata. Tags are case-insensitive for
identity and filtering while preserving a stable display spelling. Song-list
search continues to cover titles and writer credits rather than tags; tags are
handled by explicit filters.

Changing a Song's favorite status or adding/removing a tag saves that private
organization immediately and updates the in-memory Songs list, rather than
making the rest of the detail form dirty. A failed organization save falls back
to the detail form's normal dirty/retry state. Other detail fields retain their
explicit Save lifecycle.

Filters narrow one another: a Song must match every selected tag, the favorite
filter when active, and any special exclusion. The filter UI is faceted and
offers an additional criterion only when adding it can leave a result. This
keeps impossible tag intersections out of the UI without introducing a general
boolean-query builder.

`Holiday` is an ordinary editable tag. The only special case is an **Exclude
Holiday** filter, defaulted on from January 1 through November 15 and off from
November 16 through December 31 using the User's local date when a tab session
starts. Holiday inclusion and exclusion are never offered simultaneously. A
general negative-tag system is deferred until another real exclusion case
exists.

Song and Artist lists retain separate search/sort state, and the Song list also
retains filters, for the current browser-tab session. This state is not account
data, is not synchronized across devices, and is not encoded in the URL.
