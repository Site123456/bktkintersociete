import mongoose from "mongoose";
import connectDB from "@/lib/connectDB";
import { Delivery } from "@/types/delivery";
import PDFButton from "@/components/PDFButton";

export const dynamic = "force-dynamic";

function shortId(id: string) {
  return `${id.slice(0, 2)}${id.slice(-4)}`;
}

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
    site: doc.site,
    items: doc.items,
  }));
}

export default async function DeliveriesPage() {
  const deliveries = await getDeliveries();

  return (
    <div className="p-10 space-y-10">
      <h1 className="text-4xl font-semibold tracking-tight">
        Bon de Livraison
      </h1>

      <div className="space-y-6">
        {deliveries.map((d) => (
          <div
            key={d._id}
            className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-medium">
                  Livraison #{shortId(d._id)}
                </h2>
                <p className="text-neutral-500 text-sm">{d.date}</p>
              </div>

              <PDFButton delivery={d} />
            </div>

            <div className="mt-4 text-sm text-neutral-700 space-y-1">
              <p>
                <strong>Demandé:</strong> {d.requestedDeliveryDate}
              </p>
              <p>
                <strong>Signé par:</strong> {d.signedBy}
              </p>
              <p>
                <strong>Ref:</strong> {d.ref}
              </p>
            </div>

            {d.site && (
              <div className="mt-4 text-sm text-neutral-700 space-y-1">
                <p>
                  <strong>Site:</strong> {d.site.name}
                </p>
                <p>{d.site.line1}</p>
                <p>{d.site.line2}</p>
              </div>
            )}

            <div className="mt-4">
              <h3 className="font-medium">Articles</h3>
              <ul className="list-disc pl-6 text-sm text-neutral-700">
                {d.items.map((item, i) => (
                  <li key={i}>
                    {item.name} — {item.qty} {item.unit}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {deliveries.length === 0 && (
          <p className="text-neutral-500">Aucune livraison trouvée.</p>
        )}
      </div>
    </div>
  );
}
