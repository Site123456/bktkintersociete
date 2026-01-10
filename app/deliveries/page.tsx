import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";
import DeliveriesClient from "./DeliveriesClient";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type SiteSlug =
  | "BKTK01"
  | "BKTK02"
  | "BKTK03"
  | "BKTK04"
  | "BKTK05"
  | "BKTK06"
  | "BKTK07"
  | "BKTK08";

type Site = {
  slug: SiteSlug;
  name: string;
  line1: string;
  line2: string;
};

type DeliveryItem = {
  name: string;
  qty: number;
  unit: string;
};

type Delivery = {
  _id: string;
  date: string;
  requestedDeliveryDate: string;
  signedBy: string;
  ref: string;
  site: Site | null;
  items: DeliveryItem[];
};

/* -------------------------------------------------------------------------- */
/*                                   HELPERS                                  */
/* -------------------------------------------------------------------------- */

const FALLBACK_SITES: Site[] = [
  { slug: "BKTK01", name: "INS Paris 15", line1: "", line2: "" },
  { slug: "BKTK02", name: "INS Bordeaux", line1: "", line2: "" },
  { slug: "BKTK03", name: "INS Courbevoie", line1: "", line2: "" },
  { slug: "BKTK04", name: "INS Saint-Ouen", line1: "", line2: "" },
  { slug: "BKTK05", name: "INS Bagneux", line1: "", line2: "" },
  { slug: "BKTK06", name: "INS Ivry", line1: "", line2: "" },
  { slug: "BKTK07", name: "AFS", line1: "", line2: "" },
  { slug: "BKTK08", name: "Koseli Buffet", line1: "", line2: "" },
];

function isSiteSlug(value: string): value is SiteSlug {
  return [
    "BKTK01",
    "BKTK02",
    "BKTK03",
    "BKTK04",
    "BKTK05",
    "BKTK06",
    "BKTK07",
    "BKTK08",
  ].includes(value as SiteSlug);
}

/* -------------------------------------------------------------------------- */
/*                                   DB FETCH                                 */
/* -------------------------------------------------------------------------- */

async function getDeliveries(): Promise<Delivery[]> {
  await connectDB();

  const db = mongoose.connection.db!;
  const docs = await db
    .collection("deliveries")
    .find({})
    .sort({ _id: -1 })
    .toArray();

  return docs.map((doc) => ({
    _id: doc._id.toString(),
    date: doc.date,
    requestedDeliveryDate: doc.requestedDeliveryDate,
    signedBy: doc.signedBy,
    ref: doc.ref,
    site: doc.site ?? null,
    items: doc.items,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default async function DeliveriesPage(props: {
  searchParams: Promise<{ site?: string }>;
}) {
  const searchParams = await props.searchParams;
  const siteParam = searchParams?.site;
  const selectedSite = siteParam && isSiteSlug(siteParam) ? siteParam : null;

  const deliveries = await getDeliveries();

  return (
    <DeliveriesClient
      deliveries={deliveries}
      selectedSite={selectedSite}
      sites={FALLBACK_SITES}
    />
  );
}
