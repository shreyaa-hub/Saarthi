"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpClinician, signUpPatient, type ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Stethoscope, User } from "lucide-react";

const initialState: ActionState = { error: null };

export function SignUpForm() {
  const [clinicianState, clinicianAction, clinicianPending] = useActionState(
    signUpClinician,
    initialState,
  );
  const [patientState, patientAction, patientPending] = useActionState(
    signUpPatient,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Create your account</CardTitle>
        <CardDescription>Choose the account type that fits you.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clinician">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clinician">
              <Stethoscope className="size-4" /> Clinician
            </TabsTrigger>
            <TabsTrigger value="patient">
              <User className="size-4" /> Patient
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clinician" className="pt-4">
            <form action={clinicianAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c_full_name">Full name</Label>
                <Input id="c_full_name" name="full_name" required autoComplete="name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c_clinic_name">Clinic / practice (optional)</Label>
                <Input id="c_clinic_name" name="clinic_name" placeholder="e.g. Bright Path Therapy" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c_email">Email</Label>
                <Input id="c_email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="c_password">Password</Label>
                <Input
                  id="c_password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {clinicianState.error && (
                <p className="text-sm text-destructive">{clinicianState.error}</p>
              )}
              {clinicianState.message && (
                <p className="text-sm text-success">{clinicianState.message}</p>
              )}
              <Button type="submit" disabled={clinicianPending} className="mt-1">
                {clinicianPending && <Loader2 className="size-4 animate-spin" />}
                Create clinician account
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="patient" className="pt-4">
            <form action={patientAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p_full_name">Full name</Label>
                <Input id="p_full_name" name="full_name" required autoComplete="name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p_email">Email</Label>
                <Input id="p_email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p_password">Password</Label>
                <Input
                  id="p_password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p_invite_code">
                  Invite code <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="p_invite_code"
                  name="invite_code"
                  placeholder="From your clinician"
                  className="uppercase"
                />
              </div>
              {patientState.error && (
                <p className="text-sm text-destructive">{patientState.error}</p>
              )}
              {patientState.message && (
                <p className="text-sm text-success">{patientState.message}</p>
              )}
              <Button type="submit" disabled={patientPending} className="mt-1">
                {patientPending && <Loader2 className="size-4 animate-spin" />}
                Create patient account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
