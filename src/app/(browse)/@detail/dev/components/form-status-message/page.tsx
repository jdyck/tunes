import FormStatusMessage from "@/components/ui/FormStatusMessage";

export default function FormStatusMessageDemoPage() {
  return (
    <div className="flex flex-col gap-2">
      <FormStatusMessage>Failed to add song: name is required.</FormStatusMessage>
      <FormStatusMessage type="success">Password updated.</FormStatusMessage>
    </div>
  );
}
