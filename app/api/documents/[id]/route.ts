import { requireVerifiedSession } from "@/lib/auth";
import { json, serverError } from "@/lib/http";
import { getDocument } from "@/lib/deliveries";
import { objectId } from "@/lib/validation";

/** One document (website, validated users only). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireVerifiedSession();
    if (!session.ok) return json({ ok: false, error: session.error }, session.status);

    const { id } = await params;
    if (!objectId.safeParse(id).success) return json({ ok: false, error: "Document introuvable" }, 404);

    const document = await getDocument(id);
    if (!document) return json({ ok: false, error: "Document introuvable" }, 404);
    return json({ ok: true, document });
  } catch (err) {
    console.error("GET /api/documents/[id]:", err instanceof Error ? err.message : "unknown error");
    return serverError();
  }
}
