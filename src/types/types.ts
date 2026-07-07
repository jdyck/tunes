// src/types/types.ts

import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {}

export interface Tune {
  id?: string;
  name: string;
  composer?: string;
  lyricist?: string | null;
  year?: string | null;
  notes: string;
  user_id: string;
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
}
