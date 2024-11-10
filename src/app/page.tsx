// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Tune } from "@/types/types";
import Link from "next/link";

export default function HomePage() {
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("Session data:", data);
      setUser(data.session?.user ?? null);
    };

    fetchSession();
  }, []);

  useEffect(() => {
    const fetchTunes = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("tunes")
          .select("*")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error fetching tunes:", error.message);
        } else {
          setTunes(data as Tune[]);
        }
      }
      setLoading(false);
    };

    fetchTunes();
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      setUser(null);
    }
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error logging in:", error.message);
    } else {
      console.log("Login successful!");
      const sessionData = await supabase.auth.getSession();
      setUser(sessionData.data.session?.user ?? null);
    }
  };

  if (!user) {
    return (
      <>
        <div className="flex flex-col gap-4 w-[300px]">
          <input
            className="p-1"
            type="email"
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="p-1"
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="bg-slate-800 text-white uppercase text-xs p-1.5 rounded"
          >
            Log In
          </button>
        </div>
      </>
    );
  }

  return (
    <div>
      <button onClick={handleLogout}>Logout {user.email}</button>
      <div>
        {loading ? (
          <p>Loading tunes...</p>
        ) : (
          <>
            {tunes.length > 0 ? (
              tunes.map((tune) => (
                <p key={tune.id}>
                  <Link href={`/tune/${tune.id}`}>{tune.name}</Link>
                </p>
              ))
            ) : (
              <p>You don’t have any tunes yet.</p>
            )}
          </>
        )}
        <Link href="/add-tune">Add</Link>
      </div>
    </div>
  );
}
