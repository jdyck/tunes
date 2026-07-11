import Link from "next/link";
import { componentRegistry } from "./registry";

export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 shrink-0 border-r border-line-100 p-4">
        <Link href="/dev/components" className="block font-semibold mb-4">
          Components
        </Link>
        <ul className="space-y-1">
          {componentRegistry.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/dev/components/${c.slug}`}
                className="block px-2 py-1 rounded hover:bg-cream-200"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
