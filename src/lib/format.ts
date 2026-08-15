export function formatGold(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatPower(value: number): string {
  if (value >= 1000 && value % 1000 === 0) {
    return `${value / 1000}k`;
  }
  return value.toLocaleString("en-US");
}

export function formatPowerReq(value: number): string {
  return value <= 0 ? "no limit" : `${formatPower(value)}+`;
}

