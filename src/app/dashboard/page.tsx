import { requireAuth } from "@/server/iam/session";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <dl className="divide-y">
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Nome</dt>
            <dd>{user.nome}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Papel</dt>
            <dd>{user.papel}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Categoria</dt>
            <dd>{user.categoria}</dd>
          </div>
        </dl>
        <SignOutButton />
      </div>
    </main>
  );
}