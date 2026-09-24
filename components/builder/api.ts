"use client";

import { toast } from "sonner";

/*
 * Same-origin JSON calls from the website. Authentication is the Clerk session cookie only
 * (never an API key). 401 = session expired → the page reloads (drafts are kept in the browser).
 */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Server messages that are not meant for people, in French. */
const FRIENDLY: Record<string, string> = {
  Unauthorized: "Session expirée. Reconnectez-vous.",
  Forbidden: "Accès refusé.",
  "Server error": "Erreur du serveur. Réessayez dans un instant.",
  "Internal Server Error": "Erreur du serveur. Réessayez dans un instant.",
  "Too many requests": "Trop de demandes. Patientez une minute puis réessayez.",
  "Payload too large": "Document trop volumineux.",
  "Invalid JSON": "Requête invalide.",
  "Invalid request": "Requête invalide.",
  "Unknown site": "Site inconnu.",
};

function messageOf(status: number, body: unknown): string {
  let raw = "";
  if (body && typeof body === "object") {
    const b = body as { error?: unknown; message?: unknown };
    if (typeof b.error === "string") raw = b.error;
    else if (typeof b.message === "string") raw = b.message;
  }
  if (raw && FRIENDLY[raw]) return FRIENDLY[raw];
  if (raw) return raw;
  if (status === 403) return "Accès refusé : votre compte n’a pas les droits nécessaires.";
  if (status === 429) return FRIENDLY["Too many requests"];
  if (status >= 500) return FRIENDLY["Server error"];
  return `Erreur ${status}`;
}

let reloading = false;

/** Session expired: tell the person, then reload (the sign-in screen appears). */
function onExpired() {
  if (reloading) return;
  reloading = true;
  toast.info("Session expirée. Rechargement de la page…");
  window.setTimeout(() => window.location.reload(), 900);
}

export async function apiFetch<T>(
  url: string,
  init?: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init?.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(0, "Pas de connexion. Vérifiez le réseau puis réessayez.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.status === 401) {
    onExpired();
    throw new ApiError(401, FRIENDLY.Unauthorized);
  }
  const failed = !res.ok || (body !== null && typeof body === "object" && (body as { ok?: unknown }).ok === false);
  if (failed) throw new ApiError(res.status, messageOf(res.status, body));
  return body as T;
}

/** Toast for a failed call (nothing for an expired session: the page is reloading). */
export function toastError(err: unknown, title?: string) {
  if (err instanceof DOMException && err.name === "AbortError") return;
  if (err instanceof ApiError) {
    if (err.status === 401) return;
    if (err.status === 403) {
      toast.error("Accès refusé", { description: err.message });
      return;
    }
    toast.error(title ?? err.message, title ? { description: err.message } : undefined);
    return;
  }
  toast.error(title ?? "Une erreur est survenue. Réessayez.");
}

/** Saves the person's site (Clerk session; the server checks the site exists). */
export async function saveSite(slug: string): Promise<void> {
  await apiFetch<{ ok: true }>("/api/user/sync", { method: "POST", body: { site: slug } });
}

/** Adds a product to the shared catalogue in the background; only a failure is reported. */
export function saveProductInBackground(name: string, unit: string): void {
  apiFetch<{ ok: true }>("/api/products", { method: "POST", body: { name, unit } }).catch((err: unknown) =>
    toastError(err, `« ${name} » n’a pas été ajouté au catalogue`),
  );
}
