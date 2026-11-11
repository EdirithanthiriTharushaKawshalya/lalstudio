import { requireAdmin, live } from "@/lib/supabase";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
export const metadata = {
  title: "Studio management",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin(true);
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        Skip navigation
      </a>
      <AdminSidebar />
      <div className="admin-body">
        <header className="admin-topbar">
          <span>
            LAL STUDIO <span className="muted">/ Workspace</span>
          </span>
          <span className="admin-user">
            <span className="avatar">LS</span>
            {user.email}
          </span>
        </header>
        {!live && (
          <div className="admin-preview">
            Read-only sample preview · Connect Supabase and provision a staff
            account to save changes. No client records are seeded.
          </div>
        )}
        <main id="admin-main" className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
