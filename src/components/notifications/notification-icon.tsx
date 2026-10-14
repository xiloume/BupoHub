import { Info, CheckCircle2, AlertTriangle, LayoutGrid, CreditCard, UserRound, Wrench, ShieldCheck, type LucideProps } from "lucide-react";
import { NOTIFICATION_TYPE_META } from "@/lib/meta";
import { cn } from "@/lib/utils";

const ICONS = { Info, CheckCircle2, AlertTriangle, LayoutGrid, CreditCard, UserRound, Wrench, ShieldCheck };

export function NotificationIcon({ type, className, ...props }: { type: keyof typeof NOTIFICATION_TYPE_META } & LucideProps) {
  const meta = NOTIFICATION_TYPE_META[type] ?? NOTIFICATION_TYPE_META.INFO;
  const Comp = ICONS[meta.icon as keyof typeof ICONS] ?? Info;
  return <Comp className={cn(meta.color, className)} {...props} />;
}
