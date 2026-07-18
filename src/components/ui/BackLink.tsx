import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/16/solid";

export default function BackLink({
  href,
  label = "Back",
  className = "inline-block",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={href} aria-label={label} className={className}>
      <ArrowLeftIcon className="h-10 w-10" />
    </Link>
  );
}
