"use client";

import * as React from "react";
import { useActionState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormError, SubmitButton, useActionToast } from "@/components/ui/form";
import { PasswordInput } from "@/components/auth/password-input";
import { createUserAction } from "@/actions/admin";
import { initialActionState } from "@/lib/utils";

type Role = { id: string; slug: string; name: string };

export function CreateUserDialog({ roles, trigger }: { roles: Role[]; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [state, action] = useActionState(createUserAction, initialActionState);
  useActionToast(state, () => setOpen(false));
  const fe = state.fieldErrors ?? {};
  const defaultRole = roles.find((r) => r.slug === "user")?.id ?? roles[0]?.id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Nouvel utilisateur" description="Le compte sera créé immédiatement avec le mot de passe indiqué.">
        <form action={action} className="flex flex-col gap-4">
          <FormError state={state} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom d'utilisateur" htmlFor="c-username" error={fe.username}>
              <Input id="c-username" name="username" required />
            </Field>
            <Field label="Nom affiché" htmlFor="c-displayName" error={fe.displayName}>
              <Input id="c-displayName" name="displayName" />
            </Field>
          </div>
          <Field label="Email" htmlFor="c-email" error={fe.email}>
            <Input id="c-email" name="email" type="email" required />
          </Field>
          <Field label="Mot de passe" htmlFor="c-password" error={fe.password} hint="8 caractères min., lettre + chiffre">
            <PasswordInput id="c-password" name="password" required autoComplete="new-password" />
          </Field>
          <Field label="Rôle" htmlFor="c-role" error={fe.roleId}>
            <Select id="c-role" name="roleId" defaultValue={defaultRole}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </Field>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" type="button">Annuler</Button></DialogClose>
            <SubmitButton>Créer le compte</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
