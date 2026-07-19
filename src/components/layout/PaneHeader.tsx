import BackLink from "@/components/ui/BackLink";

export default function PaneHeader({
  backHref,
  backLabel = "Back",
  safeAreaTop = false,
  children,
}: {
  backHref?: string;
  backLabel?: string;
  safeAreaTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`shrink-0 border-b border-line-100 px-4 lg:px-8 pb-0 lg:pt-8 ${
        safeAreaTop ? "pt-[env(safe-area-inset-top)]" : ""
      }`}
    >
      {backHref && (
        <BackLink
          href={backHref}
          label={backLabel}
          className="lg:hidden text-mojo-700"
        />
      )}
      {children}
    </div>
  );
}
