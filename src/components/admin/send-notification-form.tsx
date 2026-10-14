"use client";

import * as React from "react";
import { useActionState } from "react";
import { Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormError, SubmitButton, useActionToast } from "@/components/ui/form";
import { sendNotificationAction } from "@/actions/admin";
import { NOTIFICATION_TYPE_META } from "@/lib/meta";
import { initialActionState } from "@/lib/utils";

export function SendNotificationForm({ users }: { users: { id: string; username: string; email: string }[] }) {
  const [state, action] = useActionState(sendNotificationAction, initialActionState);
  const [target, setTarget] = React.useState<"all" | "user">("all");
  const ref = React.useRef<HTMLFormElement>(null);
  useActionToast(state, () => ref.current?.reset());
  const fe = state.fieldErrors ?? {};
  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle>Envoyer une notification</CardTitle>
        <CardDescription>Elle apparaîtra dans la cloche et la page Notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={ref} action={action} className="flex flex-col gap-4">
          <FormError state={state} />
          <Field label="Destinataire" htmlFor="target">
            <Select id="target" name="target" value={target} onChange={(e) => setTarget(e.target.value as "all" | "user")}>
              <option value="all">Tous les utilisateurs</option>
              <option value="user">Un utilisateur</option>
            </Select>
          </Field>
          {target === "user" ? (
            <Field label="Utilisateur" htmlFor="userId" error={fe.userId}>
              <Select id="userId" name="userId" required>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username} — {u.email}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Type" htmlFor="type">
            <Select id="type" name="type" defaultValue="INFO">
              {Object.entries(NOTIFICATION_TYPE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </Select>
          </Field>
          <Field label="Titre" htmlFor="title" error={fe.title}><Input id="title" name="title" required maxLength={120} /></Field>
          <Field label="Message" htmlFor="body" error={fe.body}><Textarea id="body" name="body" maxLength={2000} /></Field>
          <Field label="Lien (optionnel)" htmlFor="link" error={fe.link} hint="Ex. /services ou https://…"><Input id="link" name="link" /></Field>
          <SubmitButton><Send /> Envoyer</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
