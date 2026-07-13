import MusicBrainzLink from "@/components/MusicBrainzLink";

export default function MusicBrainzLinkDemoPage() {
  return (
    <div className="flex flex-col gap-2 items-start">
      <MusicBrainzLink type="work" id="c78a3273-5964-3266-9a83-8a9f6a0d2b3f" />
      <MusicBrainzLink type="recording" id="f8b0f0a0-9f9f-4f9f-8f9f-0f9f9f9f9f9f" />
    </div>
  );
}
