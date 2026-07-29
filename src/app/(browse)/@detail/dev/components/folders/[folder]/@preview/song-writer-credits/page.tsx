import SongWriterCredits from "@/components/song/SongWriterCredits";

export default function SongWriterCreditsDemoPage() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 font-semibold">Shared writer credit</h2>
        <SongWriterCredits
          writers={[
            {
              artistId: "demo-artist",
              canonicalName: "Cole Porter",
              creditedAs: "Cole Porter",
              role: "writer",
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Separate roles</h2>
        <SongWriterCredits
          writers={[
            {
              canonicalName: "George Gershwin",
              creditedAs: "George Gershwin",
              role: "composer",
            },
            {
              canonicalName: "Ira Gershwin",
              creditedAs: "Ira Gershwin",
              role: "lyricist",
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-1 font-semibold">Empty</h2>
        <SongWriterCredits writers={[]} />
      </section>
    </div>
  );
}
