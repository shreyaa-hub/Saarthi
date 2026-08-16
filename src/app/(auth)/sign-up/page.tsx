import { SignUpForm } from "@/components/auth/sign-up-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <SignUpForm next={next} />;
}
