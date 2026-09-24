/** Kind of document: bon de livraison (order to deliver) or état des stocks (inventory). */
export type DocKind = "bl" | "stock";

export interface DeliveryLine {
  name: string;
  qty: number;
  unit: string;
}

/** One document as shown in the app, the PDF and the APIs (whatever format it was stored in). */
export interface DeliveryView {
  id: string;
  kind: DocKind;
  /** Human number, e.g. BL-260924-7F3A2C */
  number: string;
  siteSlug: string | null;
  /** Full legal name printed on the PDF, e.g. INDIAN NEPALI SWAD PARIS */
  siteName: string;
  /** Short name used in the app, e.g. INS Paris 15 */
  siteShortName: string;
  siteAddress: string[];
  /** Document date, YYYY-MM-DD */
  date: string;
  /** Delivery requested for, YYYY-MM-DD (bons de livraison only) */
  requestedDate: string | null;
  author: string;
  /** ISO time the document was created */
  createdAt: string;
  note?: string;
  lines: DeliveryLine[];
}

/** A product of the catalogue. */
export interface Product {
  /** Display name, e.g. "ATTA" */
  name: string;
  /** Packaging / unit, e.g. "1 = 10KG" */
  unit: string;
  /** true for products added by the team (stored in the database) */
  custom?: boolean;
}

/** Site as used by the app. */
export interface SiteOption {
  slug: string;
  name: string;
  shortName: string;
  line1: string;
  line2: string;
}
