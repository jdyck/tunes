"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useClerk, useUser } from "@clerk/nextjs";

export default function AccountMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await signOut({ redirectUrl: "/login" });
  };

  if (!isLoaded || !user) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-paper-100 block"
      >
        <UserCircleIcon className="w-7 h-7" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-56 bg-surface-app rounded-lg shadow-lg py-2 text-sm z-10"
        >
          <p className="px-4 py-1 text-xs text-ink-600 truncate">
            {user.primaryEmailAddress?.emailAddress}
          </p>
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 hover:bg-paper-200"
          >
            Manage account
          </Link>
          <button
            role="menuitem"
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 hover:bg-paper-200"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
