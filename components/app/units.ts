/** Common packagings offered when adding a product or changing the unit of a line. */
export const COMMON_UNITS = [
  "Pièce",
  "Carton",
  "KG",
  "Sac",
  "Bouteille",
  "Paquet",
  "Boîte",
  "Rouleau",
  "Litre",
  "Barquette",
] as const;

/** Same limits as LIMITS in lib/validation (repeated here so client bundles do not pull zod). */
export const MAX_NAME_LENGTH = 80;
export const MAX_UNIT_LENGTH = 40;
export const MAX_QTY = 100_000;
