import Image from "next/image";
import Link from "next/link";
import { leagueGothic } from "@/lib/fonts";

export default function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 p-2.5 rounded-md  hover:bg-merino-200 text-3xl md:text-xl ${leagueGothic.className} tracking-wide uppercase text-ink-800/95`}
    >
      <Image src={icon} alt="" width={32} height={32} aria-hidden />
      {children}
    </Link>
  );
}
