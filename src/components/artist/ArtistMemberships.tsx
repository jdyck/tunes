"use client";

import Link from "next/link";
import { leagueGothic, robotoCondensed } from "@/lib/fonts";
import { useArtistMemberships } from "@/hooks/useArtistMemberships";
import { formatArtistMembershipDetails } from "@/utils/artistMemberships";

export default function ArtistMemberships({ artistId }: { artistId: string }) {
  const { memberships, loading, error, retry } = useArtistMemberships(artistId);
  if (!memberships.length && !loading && !error) return null;

  return (
    <div className="mb-8">
      {(["member", "group"] as const).map((relationship) => {
        const items = memberships.filter(
          (item) => item.relationship === relationship,
        );
        if (!items.length) return null;
        return (
          <section key={relationship} className="mb-4">
            <h3
              className={`mb-2 text-vermillion-700 text-2xl tracking-wide uppercase ${leagueGothic.className}`}
            >
              {relationship === "member" ? "Members" : "Groups"}
            </h3>
            <ul className={robotoCondensed.className}>
              {items.map((item, index) => {
                const details = formatArtistMembershipDetails(item);
                return (
                  <li
                    key={`${item.musicbrainz_artist_id}:${index}`}
                    className="border-b border-border-default py-2"
                  >
                    {item.artist_id ? (
                      <Link
                        href={`/artist/${item.artist_id}`}
                        className="text-azure-600 underline hover:text-azure-800"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <span>{item.name}</span>
                    )}
                    {details && (
                      <p className="text-sm text-ink-600">{details}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {memberships.length > 0 && (
        <p className="text-xs text-ink-600">
          Memberships from MusicBrainz; may be incomplete.
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-ink-600">
          Loading memberships…
        </p>
      )}
      {error && (
        <p role="status" className="text-sm text-ink-600">
          Couldn’t load memberships.{" "}
          <button
            type="button"
            onClick={retry}
            className="text-azure-600 underline"
          >
            Retry
          </button>
        </p>
      )}
    </div>
  );
}
