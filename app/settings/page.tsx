import { SettingsWorkspace } from "@/components/settings-workspace";
import { enforcePageGuard } from "@/lib/security/guards";

export default async function SettingsPage() {
  await enforcePageGuard("/settings", true);
  return <SettingsWorkspace />;
}
