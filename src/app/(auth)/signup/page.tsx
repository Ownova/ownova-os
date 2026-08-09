"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp, confirmSignUp, resendConfirmationCode } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingPassword, setPendingPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const result = await signUp(values.name, values.email, values.password);
      if (result.mode === "needs-confirmation") {
        setPendingEmail(result.email);
        setPendingPassword(values.password);
        toast.success("Check your email for a 6-digit verification code.");
        return;
      }
      toast.success(
        result.mode === "mock"
          ? "Demo mode: no AWS backend connected yet — account created with sample data."
          : "Account created"
      );
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create account");
    }
  }

  async function onConfirm() {
    if (!pendingEmail) return;
    setConfirming(true);
    try {
      await confirmSignUp(pendingEmail, code, pendingPassword);
      toast.success("Email verified — welcome to Ownova OS.");
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid or expired code");
    } finally {
      setConfirming(false);
    }
  }

  async function onResend() {
    if (!pendingEmail) return;
    try {
      await resendConfirmationCode(pendingEmail);
      toast.success("Code resent — check your email.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't resend code");
    }
  }

  if (pendingEmail) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <p className="text-sm font-medium">Verify your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input id="code" inputMode="numeric" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button className="w-full" onClick={onConfirm} disabled={confirming || code.length < 6}>
            {confirming ? "Verifying..." : "Verify and continue"}
          </Button>
          <button type="button" onClick={onResend} className="w-full text-center text-sm text-muted-foreground hover:text-foreground">
            Didn&apos;t get a code? Resend
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" placeholder="Ayesha Khan" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@ownova.org" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
