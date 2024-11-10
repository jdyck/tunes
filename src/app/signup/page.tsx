// app/signup/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) console.error("Error signing up:", error.message);
    else console.log("Signup successful!");
  };

  return (
    <div className="flex flex-col m-2 max-w-60 gap-2">
      <h1>Sign Up</h1>
      <input
        className="p-1 border"
        type="email"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="p-1 border"
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSignup} className="bg-slate-100 p-1 rounded">
        Sign Up
      </button>
    </div>
  );
}
