"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Spinner from "@/components/ui/Spinner";

export default function LoginPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginError(error.message);
      setLoggingIn(false);
      return;
    }

    router.push("/");
  };

  if (checkingAuth) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-4 w-75">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <input
          className="p-2 border border-border-default rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="p-2 border border-border-default rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={loggingIn}
          className="bg-azure-600 text-white uppercase text-lg p-1.5 rounded flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loggingIn ? (
            <>
              <Spinner /> Logging in
            </>
          ) : (
            "Log In"
          )}
        </button>
      </form>
      {loginError && <p className="text-sm text-mojo-600">{loginError}</p>}
      <div className="flex justify-between">
        <Link href="/forgot-password" className="text-azure-600 underline">
          Forgot your password?
        </Link>
        <Link href="/signup" className="text-azure-600 underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
