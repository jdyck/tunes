"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";

export default function AddRecordingPage() {
  const params = useParams();
  const tuneId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddRecording = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      setErrorMessage("User not authenticated.");
      return;
    }

    const userId = sessionData.session.user.id;

    if (!tuneId) {
      setErrorMessage("Invalid tune ID.");
      return;
    }

    const newRecording: Omit<Recording, "id"> = {
      tune_id: tuneId,
      user_id: userId,
      name,
      notes: notes || null,
      url: url || null,
    };

    const { error } = await supabase.from("recordings").insert(newRecording);

    if (error) {
      setErrorMessage("Failed to add recording: " + error.message);
    } else {
      setSuccessMessage("Recording added successfully!");
      setTimeout(() => router.push(`/tune/${tuneId}`), 1500);
    }
  };

  return (
    <div className="w-full">
      <h1>Add a New Recording</h1>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <div className="w-full">
        <label>
          Name
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Notes
          <textarea
            className="block w-full p-2 rounded-md mb-4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          URL
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
      </div>

      <button
        onClick={handleAddRecording}
        className="block mb-4 bg-slate-700 text-white w-full p-3 rounded-lg"
      >
        Add Recording
      </button>
      <button onClick={() => router.back()}>Cancel</button>
    </div>
  );
}
