// src/types/types.ts

import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {}

export interface Tune {
  id?: string;
  name: string;
  composer?: string;
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
}
