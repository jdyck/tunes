// src/types/types.ts

import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {}

export interface Song {
  id: string;
  name: string;
  year?: string | null;
  song_artist_credits?: SongArtistCredit[];
  wikipedia_extract?: string | null;
  wikipedia_url?: string | null;
  musicbrainz_work_id?: string | null;
  is_discoverable: boolean;
  first_discoverable_at?: string | null;
}

export interface SongUserData {
  user_id: string;
  song_id: string;
  notes?: string | null;
  display_title?: string | null;
  created_at: string;
}

export interface SongWithUserData extends Song {
  user_data: SongUserData;
}

export type ArtistKind =
  | "person"
  | "group"
  | "orchestra"
  | "choir"
  | "character"
  | "other";

export interface Artist {
  id: string;
  name: string;
  kind?: ArtistKind | null;
  musicbrainz_artist_id?: string | null;
}

export interface ArtistUserData {
  user_id: string;
  artist_id: string;
  notes?: string | null;
  tags?: string[] | null;
}

export type SongArtistCreditRole = "composer" | "lyricist" | "writer";

export interface SongArtistCredit {
  id?: string;
  song_id: string;
  artist_id: string;
  role: SongArtistCreditRole;
  credited_as: string;
  sort_order?: number | null;
  artists?: Artist | null; // present when fetched via embedded select
}

export interface SongArtistCreditInput {
  artistId?: string | null;
  canonicalName?: string | null;
  creditedAs: string;
  role: SongArtistCreditRole;
  artistKind?: ArtistKind | null;
  musicbrainzArtistId?: string | null;
}

export type RecordingArtistCreditRole = "performer";

export interface RecordingArtistCredit {
  id?: string;
  recording_id: string;
  artist_id: string;
  role: RecordingArtistCreditRole;
  credited_as: string;
  sort_order?: number | null;
  artists?: Artist | null;
}

export type RecordingKind = "released" | "video_capture";

export interface Recording {
  id: string;
  song_id: string;
  name: string;
  kind?: RecordingKind | null;
  artist?: string | null;
  year?: string | null;
  album?: string | null;
  duration?: string | null;
  musicbrainz_recording_id?: string | null;
  musicbrainz_release_id?: string | null;
}

export interface UserRecordingData {
  user_id: string;
  recording_id: string;
  notes?: string | null;
  rating?: number | null;
  sort_order?: number | null;
  tags?: string[] | null;
  key?: string | null;
  tempo?: string | null;
}

export type YouTubeSearchCategory = "song" | "video";
export type YouTubeDiscoverySource =
  | "ytmusic_search"
  | "youtube_search"
  | "manual_url"
  | "legacy_recording_url";

export interface YouTubeItem {
  video_id: string;
  title: string;
  channel_name?: string | null;
  search_category: YouTubeSearchCategory;
  discovery_sources: YouTubeDiscoverySource[];
  ytmusic_artist_id?: string | null;
  ytmusic_artist_name?: string | null;
  ytmusic_album_id?: string | null;
  ytmusic_album_name?: string | null;
  duration_seconds?: number | null;
  metadata_fetched_at?: string | null;
}

export interface RecordingYouTubeItem extends YouTubeItem {
  association_created_at: string;
}

export interface SavedRecording extends Recording {
  user_data: UserRecordingData;
  youtube_items: RecordingYouTubeItem[];
}
