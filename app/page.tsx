import { auth } from "@clerk/nextjs/server";
import { displayName, getClerkProfile } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { getDocument } from "@/lib/deliveries";
import { ymdParis } from "@/lib/format";
import { getSiteOptions, ensureUser } from "@/lib/users";
import { objectId } from "@/lib/validation";
import { PendingApproval } from "@/components/builder/PendingApproval";
import { SignedOutLanding } from "@/components/builder/SignedOutLanding";
import { Workspace } from "@/components/builder/Workspace";
import type { DeliveryLine, DeliveryView, DocKind } from "@/types/delivery";

export const dynamic = "force-dynamic";

/** Latest delivery date accepted by POST /api/documents. */
const MAX_AHEAD_DAYS = 60;
const MAX_LINES = 300;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Document to copy ("Recommander"); a missing or unreadable one is simply ignored. */
async function loadSource(id: string | null): Promise<DeliveryView | null> {
  if (!id) return null;
  try {
    return await getDocument(id);
  } catch {
    return null;
  }
}

/** Lines worth copying: named, quantity above zero. */
function copyLines(doc: DeliveryView): DeliveryLine[] {
  return doc.lines
    .filter((l) => l.name.trim() && Number.isFinite(l.qty) && l.qty > 0)
    .slice(0, MAX_LINES)
    .map((l) => ({ name: l.name, unit: l.unit, qty: l.qty }));
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) return <SignedOutLanding />;

  const user = await ensureUser(userId);
  if (!user || !user.verified) {
    const profile = user?.email ? null : await getClerkProfile().catch(() => null);
    return <PendingApproval email={user?.email || profile?.email || ""} role={user?.role} />;
  }

  const params = await searchParams;
  const fromParam = first(params.from) ?? "";
  const fromId = objectId.safeParse(fromParam).success ? fromParam.toLowerCase() : null;

  const [sites, products, source] = await Promise.all([getSiteOptions(), getCatalog(), loadSource(fromId)]);

  const lines = source ? copyLines(source) : [];
  const copy = source && lines.length ? { id: source.id, number: source.number, lines } : null;
  const initialKind: DocKind = copy ? "bl" : first(params.kind) === "stock" ? "stock" : "bl";

  const known = (slug: string | null | undefined) => (slug && sites.some((s) => s.slug === slug) ? slug : null);
  // "Recommander" switches to the site of the copied document.
  const site = (copy ? known(source?.siteSlug) : null) ?? known(user.site);

  return (
    <Workspace
      user={{ name: displayName(user), role: user.role, site }}
      sites={sites}
      products={products}
      initialKind={initialKind}
      dates={{ today: ymdParis(0), tomorrow: ymdParis(1), max: ymdParis(MAX_AHEAD_DAYS) }}
      initialFromId={copy?.id}
      initialFromNumber={copy?.number}
      initialLines={copy?.lines}
    />
  );
}
