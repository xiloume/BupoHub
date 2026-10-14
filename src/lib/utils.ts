import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Résultat standard d'une Server Action de formulaire. */
export type ActionState<T = unknown> = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  data?: T;
};

export const initialActionState: ActionState = {};
