// src/utils/songWriters.ts

import { supabase } from "@/lib/supabaseClient";
import { SongWriterRole } from "@/types/types";

export interface WriterInput {
  name: string;
  role: SongWriterRole;
}

interface SongWriterRow {
  role: SongWriterRole;
  sort_order: number | null;
  people: { name: string } | null;
}

export const fetchSongWriters = async (
  tuneId: string
): Promise<WriterInput[]> => {
  const { data, error } = await supabase
    .from("song_writers")
    .select("role, sort_order, people(name)")
    .eq("tune_id", tuneId)
    .order("sort_order");

  if (error) throw error;

  return ((data || []) as unknown as SongWriterRow[])
    .filter((row) => row.people?.name)
    .map((row) => ({ name: row.people!.name, role: row.role }));
};

const findOrCreatePerson = async (name: string): Promise<string> => {
  const { data: existing, error: selectError } = await supabase
    .from("people")
    .select("id")
    .ilike("name", name)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("people")
    .insert({ name })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
};

// Full replace: simplest way to keep song_writers in sync with the editor's
// local row list without incremental add/remove/reorder diffing, same
// approach already used for Recording.tags.
export const saveSongWriters = async (
  tuneId: string,
  writers: WriterInput[]
): Promise<void> => {
  const { error: deleteError } = await supabase
    .from("song_writers")
    .delete()
    .eq("tune_id", tuneId);
  if (deleteError) throw deleteError;

  const namedWriters = writers.filter((w) => w.name.trim());

  for (const [index, writer] of namedWriters.entries()) {
    const personId = await findOrCreatePerson(writer.name.trim());
    const { error: insertError } = await supabase.from("song_writers").insert({
      tune_id: tuneId,
      person_id: personId,
      role: writer.role,
      sort_order: index,
    });
    if (insertError) throw insertError;
  }
};

export const formatWriterCredit = (
  writers: { role: SongWriterRole; people?: { name: string } | null }[]
): string | null => {
  const names = writers
    .filter((w) => w.people?.name)
    .map((w) => w.people!.name);
  const credited = Array.from(new Set(names));

  return credited.length > 0 ? credited.join(", ") : null;
};
