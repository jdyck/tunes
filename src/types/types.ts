// src/types/types.ts

import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {}

export interface Song {
  id: string;
  name: string;
  year?: string | null;
  song_writers?: SongWriter[];
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

export type SongWriterRole = "composer" | "lyricist" | "writer";

export interface Person {
  id: string;
  name: string;
}

export interface SongWriter {
  id?: string;
  song_id: string;
  person_id: string;
  role: SongWriterRole;
  sort_order?: number | null;
  people?: Person; // present when fetched via embedded select
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
