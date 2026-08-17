import { spawnSync } from "node:child_process";

for (const script of ["test:pure", "test:convex"]) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
