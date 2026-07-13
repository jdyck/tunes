import PrimaryButton from "@/components/PrimaryButton";

export default function PrimaryButtonDemoPage() {
  return (
    <div className="flex items-center gap-4">
      <PrimaryButton className="px-3 py-2">Search</PrimaryButton>
      <PrimaryButton className="p-3 disabled:opacity-70" disabled>
        Adding...
      </PrimaryButton>
    </div>
  );
}
