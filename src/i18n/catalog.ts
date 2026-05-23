import { en } from "./en.js";
import { tr } from "./tr.js";

export type Locale = "en" | "tr" | "__PSEUDO__";
export type MessageKey = keyof typeof en;
export type MessageParams = Record<string, string | number | boolean | undefined>;
export type MessageCatalog = Record<MessageKey, string>;

export const catalogs: Record<Exclude<Locale, "__PSEUDO__">, MessageCatalog> = {
  en,
  tr,
};
