import { SiteSlug } from "@/types/delivery";

export const SITE_HEADERS: Record<
  SiteSlug,
  { name: string; line1: string; line2: string }
> = {
  BKTK01: {
    name: "INS Paris 15",
    line1: "12 RUE DE VAUGIRARD",
    line2: "75015 PARIS – France",
  },
  BKTK02: {
    name: "INS Bordeaux",
    line1: "21 RUE SAINTE-CATHERINE",
    line2: "33000 BORDEAUX – France",
  },
  BKTK03: {
    name: "INS Courbevoie",
    line1: "8 AVENUE MARCEAU",
    line2: "92400 COURBEVOIE – France",
  },
  BKTK04: {
    name: "INS Saint-Ouen",
    line1: "14 RUE DES ROSIERS",
    line2: "93400 SAINT-OUEN – France",
  },
  BKTK05: {
    name: "INS Bagneux",
    line1: "05 ALLÉE DU PARC DE GARLANDE",
    line2: "92220 BAGNEUX – France",
  },
  BKTK06: {
    name: "INS Ivry",
    line1: "3 RUE MAURICE GUNSBOURG",
    line2: "94200 IVRY-SUR-SEINE – France",
  },
  BKTK07: {
    name: "AFS",
    line1: "10 RUE DU COMMERCE",
    line2: "75015 PARIS – France",
  },
  BKTK08: {
    name: "Koseli Buffet",
    line1: "7 RUE DE BELLEVILLE",
    line2: "75020 PARIS – France",
  },
};
