import { LoginForm } from "@/components/login-form";
import { enforcePageGuard } from "@/lib/security/guards";

export default async function LoginPage() {
  await enforcePageGuard("/login", false);
  return <LoginForm />;
}
