"use client";

import * as React from "react";
import { Copy, Eye, EyeOff, KeyRound, MonitorSmartphone, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { provisionServiceCredentialAction, regenerateServiceCredentialAction, setServiceCredentialPasswordAction, type ServiceCredential } from "@/actions/services";

export function ServiceCredentials({
  serviceId,
  serviceName,
  initial,
}: {
  serviceId: string;
  serviceName: string;
  initial: ServiceCredential | null;
}) {
  const [creds, setCreds] = React.useState(initial);
  const [revealed, setRevealed] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);
  const [pending, start] = React.useTransition();

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copié`);
  };

  const provision = () =>
    start(async () => {
      const r = await provisionServiceCredentialAction(serviceId);
      if (r.error) { toast.error(r.error); return; }
      setCreds(r.data!);
      toast.success("Identifiants créés");
    });

  const regenerate = () =>
    start(async () => {
      const r = await regenerateServiceCredentialAction(serviceId);
      if (r.error) { toast.error(r.error); return; }
      setCreds(r.data!);
      setRevealed(true);
      toast.success(r.message ?? "Mot de passe régénéré");
    });

  const setCustomPassword = () =>
    start(async () => {
      const r = await setServiceCredentialPasswordAction(serviceId, newPassword);
      if (r.error) { toast.error(r.fieldErrors?.password ?? r.error); return; }
      setCreds(r.data!);
      setNewPassword("");
      setRevealed(true);
      toast.success(r.message ?? "Mot de passe mis à jour");
    });

  return (
    <div className="card-surface flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold">
          <MonitorSmartphone className="size-4 text-accent" /> Accès {serviceName} (apps)
        </h3>
        {!creds ? (
          <Button size="sm" variant="secondary" loading={pending} onClick={provision}>
            <KeyRound /> Générer mes identifiants
          </Button>
        ) : null}
      </div>

      {creds ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <CredRow label="Nom d'utilisateur" value={creds.username} onCopy={() => copy(creds.username, "Nom d'utilisateur")} />
            <CredRow
              label="Mot de passe"
              value={revealed ? creds.password : "••••••••••••"}
              masked={!revealed}
              onCopy={() => copy(creds.password, "Mot de passe")}
              trailing={
                <button type="button" onClick={() => setRevealed((v) => !v)} className="shrink-0 rounded p-1 hover:bg-white/10" aria-label={revealed ? "Masquer" : "Afficher"}>
                  {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              }
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              <span className="text-xs text-fg-subtle">Choisir mon mot de passe</span>
              <div className="mt-1 flex items-center gap-1.5">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newPassword && setCustomPassword()}
                  placeholder="8+ caractères, lettres et chiffres"
                  autoComplete="new-password"
                  className="flex-1"
                />
                <button type="button" onClick={() => setShowNew((v) => !v)} className="shrink-0 rounded p-1 hover:bg-white/10" aria-label={showNew ? "Masquer" : "Afficher"}>
                  {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <Button size="sm" variant="secondary" loading={pending} disabled={!newPassword} onClick={setCustomPassword}>
                  Enregistrer
                </Button>
              </div>
            </div>
            <Button size="sm" variant="ghost" loading={pending} onClick={regenerate}>
              <RefreshCw /> Régénérer aléatoirement
            </Button>
          </div>
          <p className="text-xs text-fg-subtle">
            Ces identifiants servent dans les applications Jellyfin (mobile, TV…). Le bouton « Ouvrir » vous connecte automatiquement dans le navigateur.
          </p>
        </>
      ) : (
        <p className="text-xs text-fg-subtle">
          Générez un identifiant et un mot de passe pour vous connecter à {serviceName} depuis les applications Jellyfin (mobile, TV…).
        </p>
      )}
    </div>
  );
}

function CredRow({ label, value, masked, onCopy, trailing }: { label: string; value: string; masked?: boolean; onCopy: () => void; trailing?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-fg-subtle">{label}</span>
      <div className="flex items-center gap-1.5">
        <code className={`flex-1 truncate rounded-lg border border-border bg-bg-elevated px-3 py-2 text-sm ${masked ? "tracking-widest" : ""}`}>{value}</code>
        {trailing}
        <button type="button" onClick={onCopy} className="shrink-0 rounded p-1 hover:bg-white/10" aria-label={`Copier ${label.toLowerCase()}`}>
          <Copy className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
