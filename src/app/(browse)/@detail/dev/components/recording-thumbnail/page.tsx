import RecordingThumbnail from "@/components/RecordingThumbnail";

export default function RecordingThumbnailDemoPage() {
  return (
    <div className="flex items-center gap-4">
      <div>
        <p className="text-xs text-ink-600 mb-2">With image</p>
        <RecordingThumbnail
          src="https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg"
          className="w-20 h-16 rounded"
        />
      </div>
      <div>
        <p className="text-xs text-ink-600 mb-2">No image (fallback)</p>
        <RecordingThumbnail src={null} className="w-20 h-16 rounded" />
      </div>
    </div>
  );
}
