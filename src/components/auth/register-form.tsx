"use client";

import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { Field, Input } from "@/components/ui/input";
import { FormError, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import { initialActionState } from "@/lib/utils";

export function RegisterForm({
  invite,
  lockedEmail,
  labels,
}: {
  invite?: string;
  lockedEmail?: string;
  labels: { email: string; username: string; password: string; confirm: string; submit: string };
}) {
  const [state, action] = useActionState(registerAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      {invite ? <input type="hidden" name="invite" value={invite} /> : null}
      <FormError state={state} />
      <Field label={labels.email} htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={lockedEmail} readOnly={Boolean(lockedEmail)} aria-invalid={Boolean(fe.email)} />
      </Field>
      <Field label={labels.username} htmlFor="username" error={fe.username} hint="3 à 32 caractères : lettres, chiffres, _ . -">
        <Input id="username" name="username" autoComplete="username" required aria-invalid={Boolean(fe.username)} />
      </Field>
      <Field label={labels.password} htmlFor="password" error={fe.password} hint="8 caractères minimum, avec au moins une lettre et un chiffre">
        <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={Boolean(fe.password)} />
      </Field>
      <Field label={labels.confirm} htmlFor="confirm" error={fe.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required aria-invalid={Boolean(fe.confirm)} />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
