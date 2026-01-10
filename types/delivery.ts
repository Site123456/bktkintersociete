export type SiteSlug =
  | "BKTK01"
  | "BKTK02"
  | "BKTK03"
  | "BKTK04"
  | "BKTK05"
  | "BKTK06"
  | "BKTK07"
  | "BKTK08";

export type Site = {
  _id?: string;
  slug: SiteSlug;
  name: string;
};

export interface DeliveryItem {
  name: string;
  unit: string;
  qty: number;
}

export interface Delivery {
  _id: string;
  date: string;
  requestedDeliveryDate: string;
  signedBy: string;
  ref: string;
  site: {
    slug: SiteSlug;
    name: string;
    line1: string;
    line2: string;
  } | null;
  items: DeliveryItem[];
}
