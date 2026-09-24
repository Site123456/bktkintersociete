"use client";

import { toast } from "sonner";

/*
 * Same-origin JSON calls to /api/admin/*. Authentication is the Clerk session cookie only (never an
 * API key). 401 = session expired → the page reloads and the sign-in screen appears.
 */

export class AdminApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

/** Server messages that are not meant for people, in French. */
const FRIENDLY: Record<string, string> = {
  Unauthorized: "Session expirée. Reconnectez-vous.",
  Forbidden: "Accès refusé.",
  "Server error": "Erreur du serveur. Réessayez dans un instant.",
  "Too many requests": "Trop de demandes. Patientez une minute puis réessayez.",
  "Payload too large": "Requête trop volumineuse.",
  "Invalid JSON": "Requête invalide.",
  "Invalid request": "Requête invalide.",
};

function messageOf(status: number, body: unknown): string {
  let raw = "";
  if (body && typeof body === "object") {
    const e = (body as { error?: unknown }).error;
    if (typeof e === "string") raw = e;
  }
  if (raw && FRIENDLY[raw]) return FRIENDLY[raw];
  // Validation messages look like "field: message"; keep only the message.
  if (raw && status === 400) return raw.replace(/^[\w.]+: /, "");
  if (raw) return raw;
  if (status === 403) return "Accès refusé : réservé aux administrateurs.";
  if (status === 429) return FRIENDLY["Too many requests"];
  if (status >= 500) return FRIENDLY["Server error"];
  return `Erreur ${status}`;
}

let reloading = false;

function onExpired() {
  if (reloading) return;
  reloading = true;
  toast.info("Session expirée. Rechargement de la page…");
  window.setTimeout(() => window.location.reload(), 900);
}

export async function adminFetch<T>(url: string, init?: { method?: "GET" | "PATCH" | "DELETE"; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new AdminApiError(0, "Pas de connexion. Vérifiez le réseau puis réessayez.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 401) {
    onExpired();
    throw new AdminApiError(401, FRIENDLY.Unauthorized);
  }
  const failed = !res.ok || (body !== null && typeof body === "object" && (body as { ok?: unknown }).ok === false);
  if (failed) throw new AdminApiError(res.status, messageOf(res.status, body));
  return body as T;
}

/** Toast for a failed call (nothing for an expired session: the page is reloading). */
export function toastError(err: unknown, title: string) {
  if (err instanceof AdminApiError) {
    if (err.status === 401) return;
    toast.error(title, { description: err.message });
    return;
  }
  toast.error(title, { description: "Une erreur est survenue. Réessayez." });
}
