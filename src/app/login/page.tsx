import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.papelId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <LoginForm />
    </main>
  );
}