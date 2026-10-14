"use client";

import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction } from "@/actions/auth";
import { Field, Input } from "@/components/ui/input";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import { initialActionState } from "@/lib/utils";

export function ForgotForm({ labels }: { labels: { email: string; submit: string } }) {
  const [state, action] = useActionState(forgotPasswordAction, initialActionState);
  if (state.ok) return <FormSuccess state={state} />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <FormError state={state} />
      <Field label={labels.email} htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {labels.submit}
      </SubmitButton>
    </form>
  );
}

export function ResetForm({ token, labels }: { token: string; labels: { password: string; confirm: string; submit: string } }) {
  const [state, action] = useActionState(resetPasswordAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <Field label={labels.password} htmlFor="password" error={fe.password} hint="8 caractères minimum, avec au moins une lettre et un chiffre">
        <PasswordInput id="password" name="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field label={labels.confirm} htmlFor="confirm" error={fe.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        {labels.submit}
      </SubmitButton>
    </form>
  );
}
