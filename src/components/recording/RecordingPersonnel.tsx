import Link from "next/link";
import type { RecordingAttributionInput } from "@/utils/musicbrainzRecordingAttribution";
import type { RecordingPersonnelEntry } from "@/utils/recordingPersonnel";
import { recordingPersonnelRows } from "@/utils/recordingPersonnelView";

export default function RecordingPersonnel({
  attribution,
  personnel,
}: {
  attribution: readonly RecordingAttributionInput[];
  personnel: readonly RecordingPersonnelEntry[];
}) {
  const rows = recordingPersonnelRows(attribution, personnel);
  if (rows.length === 0) return null;

  return (
    <section className="mt-3" aria-labelledby="recording-personnel-heading">
      <h2
        id="recording-personnel-heading"
        className="text-xs font-medium text-ink-600"
      >
        Personnel
      </h2>
      <ul className="mt-1 space-y-1 text-sm text-ink-800">
        {rows.map((row) => (
          <li key={row.artistId ?? `${row.creditedAs}-${row.details.join("|")}`}>
            {row.artistId ? (
              <Link
                href={`/artist/${row.artistId}`}
                className="text-azure-700 underline"
              >
                {row.creditedAs}
              </Link>
            ) : (
              row.creditedAs
            )}
            {row.details.length > 0 && ` — ${row.details.join(", ")}`}
          </li>
        ))}
      </ul>
    </section>
  );
}
