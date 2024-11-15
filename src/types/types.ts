// src/types/types.ts

import { User as SupabaseUser } from "@supabase/supabase-js";

export interface User extends SupabaseUser {}

export interface Tune {
  id?: string;
  name: string;
  year: string;
  notes: string;
  user_id: string;
}

export interface Recording {
  id: string;
  tune_id: string;
  user_id: string;
  name: string;
  notes: string;
  url: string;
  rating: number;
  sortOrder: number;
}
