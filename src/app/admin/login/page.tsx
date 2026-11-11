import Link from "next/link";
import { ActionForm, Field } from "@/components/ui/form";
import { login } from "@/features/admin/actions";
import { live } from "@/lib/supabase";
import { StudioLogo } from "@/components/layout/studio-logo";
import {
  authConfigurationIssues,
  isHosted,
} from "@/lib/supabase-configuration";
export const metadata = {
  title: "Staff sign-in",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <StudioLogo />
      <div className="login-box">
        <span className="eyebrow">THE STUDIO WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in with your provisioned staff account.</p>
        {live && authConfigurationIssues.length > 0 && (
          <p className="message error" role="alert">
            Sign-in setup is incomplete. Configure{" "}
            {authConfigurationIssues.join(", ")} in{" "}
            {isHosted
              ? "Vercel Production environment variables"
              : "your server environment"}{" "}
            and restart or redeploy.
          </p>
        )}
        {error === "staff" && (
          <p className="message error" role="alert">
            Your account does not currently have studio staff access. Ask the
            studio owner to provision it.
          </p>
        )}
        <ActionForm action={login} submit="Sign in →">
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </ActionForm>
        {!live && (
          <p className="message">
            {isHosted ? (
              `Staff sign-in is not configured on this deployment. Add ${authConfigurationIssues.join(", ")} to Vercel Production environment variables and redeploy.`
            ) : (
              <>
                Supabase is not connected.{" "}
                <Link href="/admin">Explore the read-only admin preview →</Link>
              </>
            )}
          </p>
        )}
        <p className="small muted">
          Accounts are provisioned by the studio. Contact the owner for access.
        </p>
      </div>
      <Link className="text-link" href="/">
        ← Back to LAL STUDIO
      </Link>
    </main>
  );
}
