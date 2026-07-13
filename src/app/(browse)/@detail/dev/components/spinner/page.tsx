import Spinner from "@/components/Spinner";

export default function SpinnerDemoPage() {
  return (
    <div className="flex items-center gap-4">
      <Spinner />
      <Spinner className="w-8 h-8 text-teal-700" />
    </div>
  );
}
