// app/add-tune/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Tune } from "@/types";

export default function AddTune() {
  const [name, setName] = useState<Tune["name"]>("");
  const [year, setYear] = useState<Tune["year"]>("");
  const [notes, setNotes] = useState<Tune["notes"]>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("Session data:", data);
      setUser(data.session?.user ?? null);
    };

    fetchSession();
  }, []);

  const handleAddTune = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!user) {
      setErrorMessage("User not logged in.");
      return;
    }

    const tune: Tune = {
      name,
      year,
      notes,
      user_id: user.id,
    };

    const { data, error } = await supabase.from("tunes").insert([tune]);

    if (error) {
      setErrorMessage("Failed to add tune: " + error.message);
      console.error("Error adding tune:", error.message);
    } else {
      setSuccessMessage("Tune added successfully!");
      setName("");
      setYear("");
      setNotes("");
      console.log("Tune added:", data);
    }
  };

  return (
    <div>
      <h1>Add a New Tune</h1>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
      <div>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Year:
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Notes:
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
      <button onClick={handleAddTune}>Add Tune</button>
    </div>
  );
}
