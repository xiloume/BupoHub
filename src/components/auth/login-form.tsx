"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/actions/auth";
import { Field, Input } from "@/components/ui/input";
import { FormError, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import { initialActionState } from "@/lib/utils";

export function LoginForm({
  next,
  labels,
}: {
  next?: string;
  labels: { identifier: string; password: string; forgot: string; submit: string };
}) {
  const [state, action] = useActionState(loginAction, initialActionState);
  return (
    <form action={action} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormError state={state} />
      <Field label={labels.identifier} htmlFor="identifier" error={state.fieldErrors?.identifier}>
        <Input id="identifier" name="identifier" autoComplete="username" required autoFocus aria-invalid={Boolean(state.fieldErrors?.identifier)} />
      </Field>
      <Field label={labels.password} htmlFor="password" error={state.fieldErrors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <div className="-mt-2 flex justify-end">
        <Link href="/mot-de-passe-oublie" className="text-xs text-fg-muted hover:text-accent">
          {labels.forgot}
        </Link>
      </div>
      <SubmitButton size="lg" className="w-full">
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
