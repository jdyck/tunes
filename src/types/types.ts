// src/types/types.ts

import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {}

export interface Tune {
  id?: string;
  name: string;
  year?: string | null;
  notes: string;
  user_id: string;
  song_writers?: SongWriter[];
  wikipedia_extract?: string | null;
  wikipedia_url?: string | null;
  musicbrainz_work_id?: string | null;
}

export type SongWriterRole = "composer" | "lyricist" | "writer";

export interface Person {
  id: string;
  name: string;
}

export interface SongWriter {
  id?: string;
  tune_id: string;
  person_id: string;
  role: SongWriterRole;
  sort_order?: number | null;
  people?: Person; // present when fetched via embedded select
}

export interface Recording {
  id: string;
  tune_id: string;
  user_id: string;
  name: string;
  notes?: string | null;
  url?: string | null;
  rating?: number | null;
  sortOrder?: number | null;
  kind?: "released" | "video_capture" | null;
  artist?: string | null;
  year?: string | null;
  album?: string | null;
  duration?: string | null;
  key?: string | null;
  tempo?: number | null;
  tags?: string[] | null;
  musicbrainz_recording_id?: string | null;
}
