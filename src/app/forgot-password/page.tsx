"use client";

import { useState } from "react";
import FormStatusMessage from "@/components/ui/FormStatusMessage";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "@/components/ui/Spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account`,
    });
    setSending(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-[700] mb-2">Check your email</h1>
        <p className="text-sm">
          If an account exists for {email}, we’ve sent a link to reset your
          password.
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
    <div className="w-full max-w-sm">
      <h1 className="text-lg font-[700] mb-4">Reset password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="p-1"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-slate-800 text-white uppercase text-xs p-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {sending ? (
            <>
              <Spinner /> Sending
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
      {error && <FormStatusMessage className="mt-3">{error}</FormStatusMessage>}
      <Link
        href="/login"
        className="text-green-800 underline text-xs mt-4 inline-block"
      >
        Back to login
      </Link>
    </div>
  );
}
