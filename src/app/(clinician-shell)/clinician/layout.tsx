import { requireProfile } from "@/lib/auth/session";
import { ClinicianSidebar } from "@/components/clinician/sidebar";
import { ClinicianTopbar } from "@/components/clinician/topbar";

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile("clinician");

  return (
    <div className="flex min-h-screen bg-background">
      <ClinicianSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <ClinicianTopbar fullName={profile.full_name} headline={profile.headline} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
