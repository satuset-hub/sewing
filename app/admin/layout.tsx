import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"; import { requireAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){const auth=await requireAdmin();return <div className="flex min-h-screen bg-cream"><DashboardSidebar role="admin" name={auth.profile?.full_name||"Admin"}/><main id="main" className="min-w-0 flex-1 px-5 py-16 md:px-8 md:py-8 lg:px-10">{children}</main></div>}
