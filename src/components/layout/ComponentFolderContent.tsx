import Link from "next/link";
import { leagueGothic } from "@/lib/fonts";
import {
  getComponentGalleryHref,
  getComponentsInFolder,
} from "@/lib/componentRegistry";

export default function ComponentFolderContent({ folder }: { folder: string }) {
  const components = getComponentsInFolder(folder);

  return (
    <div>
      <h1 className={`mb-2 text-6xl uppercase ${leagueGothic.className}`}>
        {folder}
      </h1>
      <p className="mb-8 text-sm text-ink-600">
        src/components/{folder}
      </p>

      <ul className="max-w-xl">
        {components.map((component) => (
          <li key={component.slug}>
            <Link
              href={getComponentGalleryHref(component)}
              className="flex h-14 items-center border-b border-border-default px-6 hover:rounded-lg hover:border-b-0 hover:bg-merino-200 active:bg-cream-300"
            >
              <span
                className={`truncate text-xl uppercase ${leagueGothic.className}`}
              >
                {component.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
