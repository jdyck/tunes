"use client";

import { useEffect, useState } from "react";
import FormStatusMessage from "@/components/ui/FormStatusMessage";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = { type: "error" | "success"; message: string };

export default function AccountPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (password.length < 6) {
      setStatus({
        type: "error",
        message: "Password must be at least 6 characters.",
      });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setStatus({ type: "error", message: error.message });
    } else {
      setStatus({ type: "success", message: "Password updated." });
      setPassword("");
      setConfirm("");
    }
  };

  if (checkingAuth) {
    return <p>Loading...</p>;
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-lg font-[700] mb-4">Change password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="p-1"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="p-1"
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-slate-800 text-white uppercase text-xs p-1.5 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Update password"}
        </button>
      </form>
      {status && (
        <FormStatusMessage type={status.type} className="mt-3">
          {status.message}
        </FormStatusMessage>
      )}
    </div>
  );
}
