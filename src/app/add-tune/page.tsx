"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, Tune } from "@/types/types";

export default function AddTune() {
  const [name, setName] = useState<Tune["name"]>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

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

    const tune: Partial<Tune> = {
      name,
      user_id: user.id,
    };

    const { data, error } = await supabase.from("tunes").insert([tune]);

    if (error) {
      setErrorMessage("Failed to add tune: " + error.message);
      console.error("Error adding tune:", error.message);
    } else {
      setSuccessMessage("Tune added successfully!");
      setName("");
      console.log("Tune added:", data);

      // Redirect to the homepage after a short delay
      setTimeout(() => {
        router.push("/");
      }, 1000);
    }
  };

  return (
    <div className="w-full">
      <h1>Add a New Tune</h1>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
      <div className="w-full">
        <label className="block w-full pb-4">
          <span className="block"> Name</span>
          <input
            className="block w-full p-1.5"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>
      <button onClick={handleAddTune}>Add Tune</button>
    </div>
  );
}
