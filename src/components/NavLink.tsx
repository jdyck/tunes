import Link from "next/link";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-md font-semibold hover:bg-merino-200 text-2xl md:text-base"
    >
      {children}
    </Link>
  );
}
