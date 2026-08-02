"use client";

import Link from "next/link";
import { WriterInput } from "@/lib/songWriters";
import { SongArtistCreditRole } from "@/types/types";

const roleLabels: Record<SongArtistCreditRole, string> = {
  composer: "composer",
  lyricist: "lyricist",
  writer: "writer",
};

const roleOrder: SongArtistCreditRole[] = ["composer", "lyricist", "writer"];

const writerKey = (writer: WriterInput) =>
  writer.artistId || writer.canonicalName || writer.creditedAs.trim();

const hasDifferentComposerAndLyricist = (writers: WriterInput[]) => {
  if (writers.some((writer) => writer.role === "writer")) return false;

  const composerKeys = new Set(
    writers.filter((writer) => writer.role === "composer").map(writerKey)
  );
  const lyricistKeys = new Set(
    writers.filter((writer) => writer.role === "lyricist").map(writerKey)
  );

  return (
    composerKeys.size > 0 &&
    lyricistKeys.size > 0 &&
    (composerKeys.size !== lyricistKeys.size ||
      [...composerKeys].some((key) => !lyricistKeys.has(key)))
  );
};

function WriterLink({ writer }: { writer: WriterInput }) {
  const name = writer.creditedAs.trim();

  return writer.artistId ? (
    <Link href={`/artist/${writer.artistId}`} className="hover:text-azure-600">
      {name}
    </Link>
  ) : (
    <span>{name}</span>
  );
}

export default function SongWriterCredits({
  writers,
}: {
  writers: WriterInput[];
}) {
  const creditedWriters = writers.filter((writer) => writer.creditedAs.trim());
  if (creditedWriters.length === 0) return <span>No writer credits</span>;

  if (!hasDifferentComposerAndLyricist(creditedWriters)) {
    const uniqueWriters = creditedWriters.filter(
      (writer, index, all) =>
        all.findIndex((candidate) => writerKey(candidate) === writerKey(writer)) ===
        index
    );

    return (
      <>
        {uniqueWriters.map((writer, index) => (
          <span key={`${writerKey(writer)}-${index}`}>
            {index > 0 && ", "}
            <WriterLink writer={writer} />
          </span>
        ))}
      </>
    );
  }

  return (
    <>
      {roleOrder.map((role) => {
        const writersForRole = creditedWriters.filter(
          (writer) => writer.role === role
        );
        if (writersForRole.length === 0) return null;

        return (
          <span className="block" key={role}>
            {writersForRole.map((writer, index) => (
              <span key={`${writerKey(writer)}-${index}`}>
                {index > 0 && ", "}
                <WriterLink writer={writer} />
              </span>
            ))}
            , {roleLabels[role]}
            {writersForRole.length > 1 && "s"}
          </span>
        );
      })}
    </>
  );
}
