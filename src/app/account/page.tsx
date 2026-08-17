import { UserProfile } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function AccountPage() {
  await auth.protect();
  return <UserProfile routing="hash" />;
}
