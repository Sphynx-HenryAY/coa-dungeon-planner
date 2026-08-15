import type { Locale } from "./types";

export function numberLocale(locale: Locale): string {
  return locale === "zh-Hant" ? "zh-Hant-TW" : "en-US";
}

export function formatGold(value: number, locale: Locale = "en"): string {
  return Math.round(value).toLocaleString(numberLocale(locale));
}

export function formatPower(value: number, locale: Locale = "en"): string {
  if (locale === "zh-Hant") {
    if (value >= 10_000 && value % 10_000 === 0) {
      return `${value / 10_000}萬`;
    }
    if (value >= 1000 && value % 1000 === 0) {
      return `${value / 1000}千`;
    }
    return value.toLocaleString(numberLocale(locale));
  }
  if (value >= 1000 && value % 1000 === 0) {
    return `${value / 1000}k`;
  }
  return value.toLocaleString(numberLocale(locale));
}

export function formatPowerReq(
  value: number,
  locale: Locale = "en",
  noLimit = "no limit",
): string {
  return value <= 0 ? noLimit : `${formatPower(value, locale)}+`;
}

