"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tune } from "@/types/types";
import Modal from "@/components/Modal";

export default function AddSongModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [composer, setComposer] = useState("");
  const [lyricist, setLyricist] = useState("");
  const [year, setYear] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setErrorMessage("User not logged in.");
      return;
    }

    setSaving(true);
    const tune: Partial<Tune> = {
      name,
      composer: composer || undefined,
      lyricist: lyricist || null,
      year: year || null,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from("tunes")
      .insert([tune])
      .select()
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage("Failed to add song: " + error.message);
      return;
    }

    onCreated(data.id);
  };

  return (
    <Modal title="Add a Song" onClose={onClose}>
      {errorMessage && <p className="text-red-600 mb-2">{errorMessage}</p>}
      <label className="block mb-3">
        <span className="block text-sm mb-1">Name</span>
        <input
          className="block w-full p-2 rounded-md border border-slate-300"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <label className="block mb-3">
        <span className="block text-sm mb-1">Composer</span>
        <input
          className="block w-full p-2 rounded-md border border-slate-300"
          type="text"
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
        />
      </label>
      <label className="block mb-3">
        <span className="block text-sm mb-1">Lyricist</span>
        <input
          className="block w-full p-2 rounded-md border border-slate-300"
          type="text"
          value={lyricist}
          onChange={(e) => setLyricist(e.target.value)}
        />
      </label>
      <label className="block mb-4">
        <span className="block text-sm mb-1">Year</span>
        <input
          className="block w-full p-2 rounded-md border border-slate-300"
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>
      <button
        onClick={handleAdd}
        disabled={saving}
        className="block w-full bg-slate-700 text-white p-3 rounded-lg disabled:opacity-70"
      >
        {saving ? "Adding..." : "Add Song"}
      </button>
    </Modal>
  );
}
