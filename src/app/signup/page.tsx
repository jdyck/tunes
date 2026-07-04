"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "@/components/Spinner";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSigningUp(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setSigningUp(false);
      return;
    }

    if (data.user && data.user.identities?.length === 0) {
      setError("That email is already registered. Try logging in instead.");
      setSigningUp(false);
      return;
    }

    if (data.session) {
      router.push("/");
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-[700] mb-2">Check your email</h1>
        <p className="text-sm">
          We’ve sent a confirmation link to {email}. Click it to finish creating
          your account, then log in.
        </p>
        <Link
          href="/login"
          className="text-green-800 underline text-sm mt-4 inline-block"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-[300px]">
      <h1 className="text-lg font-[700]">Sign up</h1>
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <input
          className="p-1"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="p-1"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={signingUp}
          className="bg-slate-800 text-white uppercase text-xs p-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {signingUp ? (
            <>
              <Spinner /> Signing up
            </>
          ) : (
            "Sign Up"
          )}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Link href="/login" className="text-green-800 underline text-xs">
        Already have an account? Log in
      </Link>
    </div>
  );
}
