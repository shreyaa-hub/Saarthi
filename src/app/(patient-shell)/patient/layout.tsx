import { requireProfile } from "@/lib/auth/session";
import { getMyAttempts, computeStreak } from "@/lib/data/patient";
import { PatientSidebar } from "@/components/patient/sidebar";
import { PatientTopbar } from "@/components/patient/topbar";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile, user } = await requireProfile("patient");
  const attempts = await getMyAttempts(supabase, user.id);
  const streak = computeStreak(attempts.map((a) => a.completed_at));

  return (
    <div className="flex min-h-screen bg-background">
      <PatientSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <PatientTopbar fullName={profile.full_name} streak={streak} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
