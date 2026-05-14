import { Sidebar } from '@/components/shell/Sidebar';
import { Topbar } from '@/components/shell/Topbar';
import { getShellContext } from '@/lib/shell/context';

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getShellContext();

  return (
    <div className="min-h-screen flex bg-paper">
      <Sidebar kitchenName={ctx.kitchenName} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
