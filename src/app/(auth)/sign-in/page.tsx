import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; redirect?: string }>;
}) {
  const { next, redirect } = await searchParams;
  return <SignInForm next={next} redirectTo={redirect} />;
}
