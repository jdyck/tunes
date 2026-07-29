import NavLink from "@/components/ui/NavLink";

export default function NavLinkDemoPage() {
  return (
    <div className="max-w-xs space-y-2">
      <NavLink href="/songs" icon="/songs.svg">
        Songs
      </NavLink>
      <NavLink href="/artists" icon="/artists.svg">
        Artists
      </NavLink>
    </div>
  );
}
