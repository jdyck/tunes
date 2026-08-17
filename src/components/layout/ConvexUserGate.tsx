"use client";

import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Spinner from "@/components/ui/Spinner";

export default function ConvexUserGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureCurrentUser = useMutation(api.users.ensureCurrent);
  const [state, setState] = useState<"waiting" | "ready" | "error">(
    "waiting",
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setState("waiting");
      return;
    }

    let active = true;
    ensureCurrentUser()
      .then(() => {
        if (active) setState("ready");
      })
      .catch((error: unknown) => {
        console.error("Could not initialize the application User", error);
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, [ensureCurrentUser, isAuthenticated, isLoading]);

  if (state === "error") {
    return (
      <p className="p-4 text-vermillion-700">
        Could not initialize your application account. Refresh and try again.
      </p>
    );
  }

  if (!isLoading && !isAuthenticated) {
    return <RedirectToSignIn />;
  }

  if (isLoading || state !== "ready") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
