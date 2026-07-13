import AsyncStateMessage from "@/components/AsyncStateMessage";

export default function AsyncStateMessageDemoPage() {
  return (
    <div className="flex flex-col gap-2">
      <AsyncStateMessage>Loading recording...</AsyncStateMessage>
      <AsyncStateMessage variant="error">
        Error fetching recording: not found
      </AsyncStateMessage>
    </div>
  );
}
