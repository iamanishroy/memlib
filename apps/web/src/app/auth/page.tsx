import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AuthPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dash");
  }

  return (
    <div className="flex items-center justify-center min-h-dvh">
      <SignIn routing="hash" />
    </div>
  );
}
