"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Tune } from "@/types/types";
import { merriweather } from "@/lib/fonts";
import { PlusCircleIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import AddSongModal from "@/components/AddSongModal";

export default function SongsListPane() {
  const router = useRouter();

  const [tunes, setTunes] = useState<Tune[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [showAddSong, setShowAddSong] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoadingUser(false);
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

  const fetchTunes = async (userId: string) => {
    const { data, error } = await supabase
      .from("tunes")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching tunes:", error.message);
    } else {
      setTunes((data as Tune[]).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchTunes(user.id);
  }, [user]);

  const goToTune = (id: string) => {
    router.push(`/tune/${id}`);
  };

  const visibleTunes = search.trim()
    ? tunes.filter((tune) =>
        tune.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : tunes;

  if (loadingUser || !user) {
    return <p className="p-4">Loading...</p>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <h1 className={`font-bold text-xl ${merriweather.className}`}>
          Songs
        </h1>
        <button
          onClick={() => setShowAddSong(true)}
          aria-label="Add song"
          className="text-green-700"
        >
          <PlusCircleIcon className="h-7 w-7" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-slate-300 bg-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p>Loading songs...</p>
        ) : visibleTunes.length > 0 ? (
          <ul>
            {visibleTunes.map((tune) => (
              <li key={tune.id} className="mb-3">
                <Link
                  href={`/tune/${tune.id}`}
                  className="block bg-white p-3 rounded-lg"
                >
                  <SongRow tune={tune} />
                </Link>
              </li>
            ))}
          </ul>
        ) : tunes.length > 0 ? (
          <p>No songs match “{search}”.</p>
        ) : (
          <p>You don’t have any songs yet.</p>
        )}
      </div>

      {showAddSong && (
        <AddSongModal
          onClose={() => setShowAddSong(false)}
          onCreated={(id) => {
            setShowAddSong(false);
            if (user) fetchTunes(user.id);
            goToTune(id);
          }}
        />
      )}
    </div>
  );
}

function SongRow({ tune }: { tune: Tune }) {
  return (
    <div className={merriweather.className}>
      <div className="flex justify-between items-start gap-2">
        <span className="font-[400]">{tune.name}</span>
        {tune.year && (
          <span className="text-sm text-gray-500 shrink-0">{tune.year}</span>
        )}
      </div>
      {tune.composer && (
        <div className="text-sm text-gray-500">{tune.composer}</div>
      )}
    </div>
  );
}
