import LinkButton from "@/components/ui/LinkButton";

export default function LinkButtonDemoPage() {
  return (
    <div className="flex items-center gap-4">
      <LinkButton>Search</LinkButton>
      <LinkButton disabled>Searching...</LinkButton>
      <LinkButton variant="muted">Cancel</LinkButton>
    </div>
  );
}
