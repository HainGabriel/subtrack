import { Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";

export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <Wallet className="text-primary size-5" aria-hidden="true" />
        <span className="text-lg font-semibold tracking-tight">SubTrack</span>
      </div>
      <OnboardingWizard />
    </div>
  );
}
