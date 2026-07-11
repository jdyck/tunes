import Link from "next/link";
import AccountMenu from "@/components/AccountMenu";

export default function TopHeader({ className = "" }: { className?: string }) {
  return (
    <header className={`relative ${className}`}>
      <Link
        href="/"
        className="p-4 font-extrabold uppercase block text-xl w-full justify-center text-green-800"
      >
        <span>Standards</span>
      </Link>
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <AccountMenu />
      </div>
    </header>
  );
}
