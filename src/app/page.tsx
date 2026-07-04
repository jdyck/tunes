"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Tune } from "@/types/types";
import Link from "next/link";
import { merriweather } from "@/lib/fonts";

export default function HomePage() {
  const router = useRouter();
  const [tunes, setTunes] = useState<Tune[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingUser, setLoadingUser] = useState<boolean>(true); // State to track user loading
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoadingUser(false); // User session check complete
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loadingUser && !user) {
      router.replace("/login");
    }
  }, [loadingUser, user, router]);

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
          const sortedTunes = (data as Tune[]).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          setTunes(sortedTunes);
        }
      }
      setLoading(false);
    };

    fetchTunes();
  }, [user]);

  if (loadingUser || !user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="w-full">
      <div className="w-full">
        {loading ? (
          <p>Loading tunes...</p>
        ) : (
          <>
            {tunes.length > 0 ? (
              tunes.map((tune) => (
                <p key={tune.id} className="w-full">
                  <Link
                    href={`/tune/${tune.id}`}
                    className={`bg-white p-3 block mb-4 w-full rounded-lg font-[400] ${merriweather.className}`}
                  >
                    {tune.name}
                  </Link>
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
