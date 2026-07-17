import { leagueGothic } from "@/lib/fonts";

export default function AuthLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-azure-600">
      <div>
        <h1 className={`text-merino-100 text-7xl uppercase ${leagueGothic.className}`}>Standards</h1>
      </div>
      <div className="bg-merino-100 rounded-lg p-8 w-full max-w-sm m-4">
        {children}
      </div>
    </div>
  );
}
