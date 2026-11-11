import Link from "next/link";
import { ActionForm, Field } from "@/components/ui/form";
import { login } from "@/features/admin/actions";
import { live } from "@/lib/supabase";
import { StudioLogo } from "@/components/layout/studio-logo";
export const metadata = {
  title: "Staff sign-in",
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <main className="login-page">
      <StudioLogo />
      <div className="login-box">
        <span className="eyebrow">THE STUDIO WORKSPACE</span>
        <h1>Welcome back.</h1>
        <p className="muted">Sign in with your provisioned staff account.</p>
        <ActionForm action={login} submit="Sign in →">
          <Field label="Email" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
        </ActionForm>
        {!live && (
          <p className="message">
            Supabase is not connected.{" "}
            <Link href="/admin">Explore the read-only admin preview →</Link>
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
