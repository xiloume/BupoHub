"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound, CreditCard } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { logoutAction } from "@/actions/auth";

export type NavUser = {
  id: string;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  roleName: string;
};

export function UserMenu({ user, showSubscription }: { user: NavUser; showSubscription: boolean }) {
  const name = user.displayName || user.username;
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 text-sm transition-colors hover:border-border-strong hover:bg-white/5">
          <Avatar src={user.avatarUrl} name={name} size="sm" />
          <span className="hidden max-w-32 truncate font-medium sm:inline">{name}</span>
          <ChevronDown className="hidden size-3.5 text-fg-subtle sm:inline" />
        </button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-60">
        <DropdownLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-fg">{name}</span>
          <span className="truncate text-xs font-normal text-fg-subtle">{user.email}</span>
          <span className="mt-1 w-fit rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">{user.roleName}</span>
        </DropdownLabel>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/dashboard"><LayoutDashboard /> Dashboard</Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/profil"><UserRound /> Profil</Link>
        </DropdownItem>
        {showSubscription ? (
          <DropdownItem asChild>
            <Link href="/abonnement"><CreditCard /> Abonnement</Link>
          </DropdownItem>
        ) : null}
        {user.isAdmin ? (
          <>
            <DropdownSeparator />
            <DropdownItem asChild>
              <Link href="/admin"><ShieldCheck /> Administration</Link>
            </DropdownItem>
          </>
        ) : null}
        <DropdownSeparator />
        <form action={logoutAction}>
          <DropdownItem asChild>
            <button type="submit" className="w-full text-red-300 data-[highlighted]:text-red-200">
              <LogOut /> Déconnexion
            </button>
          </DropdownItem>
        </form>
      </DropdownContent>
    </Dropdown>
  );
}
