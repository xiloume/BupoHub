import * as React from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="card-surface rounded-3xl p-7 sm:p-9">
      <div className="mb-7 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-fg-muted">{subtitle}</p> : null}
      </div>
      {children}
      {footer ? <div className="mt-7 border-t border-border pt-5 text-center text-sm text-fg-muted">{footer}</div> : null}
    </div>
  );
}
