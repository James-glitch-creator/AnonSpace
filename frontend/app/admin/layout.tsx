import { AdminNavbar } from "@/components/admin/admin-navbar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <AdminNavbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 space-y-5 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
