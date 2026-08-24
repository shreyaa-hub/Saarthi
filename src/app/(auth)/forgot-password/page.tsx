import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // /auth/confirm sends a failed link back here rather than to a dead end of
  // its own, so the explanation and the way to fix it are on the same screen.
  const { error } = await searchParams;
  return <ForgotPasswordForm linkFailed={error === "link"} />;
}
