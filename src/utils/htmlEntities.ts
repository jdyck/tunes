import { decode } from "html-entities";

export const decodeHtmlEntities = (value: string): string =>
  decode(value, { level: "html5" });
