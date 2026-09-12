import { leagueGothic } from "@/lib/fonts";

export default function AuthLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-azure-600">
      <div>
        <h1 className={`text-paper-100 text-7xl uppercase mb-4 ${leagueGothic.className}`}>Standards</h1>
      </div>
      <div className="">
        {children}
      </div>
    </div>
  );
}
