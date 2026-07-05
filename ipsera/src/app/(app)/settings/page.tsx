import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { AccountSettings } from "@/components/settings/account-settings";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Your profile and preferences." />
      <div className="flex max-w-md flex-col gap-6">
        <ProfileForm />
        <AppearanceSettings />
        <AccountSettings />
      </div>
    </div>
  );
}
