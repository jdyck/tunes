/** A sourced membership, not a Recording credit or a new local Artist. */
export interface ArtistMembership {
  musicbrainz_artist_id: string;
  name: string;
  relationship: "member" | "group";
  begin: string | null;
  end: string | null;
  ended: boolean;
  attributes: string[];
}

export interface ArtistMembershipView extends ArtistMembership {
  artist_id: string | null;
}
