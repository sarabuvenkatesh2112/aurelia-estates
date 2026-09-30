export type MapConfig = { tileUrl: string; attribution: string };
// Public configuration only. No key-bearing URLs or HTML from configuration.
export function mapConfig(
  url?: string,
  attribution?: string,
): MapConfig | null {
  const tileUrl =
    url?.trim() || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const credit = attribution?.trim() || 'OpenStreetMap contributors';
  try {
    const parsed = new URL(tileUrl);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !['{z}', '{x}', '{y}'].every((t) => tileUrl.includes(t)) ||
      /[<>\p{Cc}]/u.test(credit) ||
      credit.length > 200 ||
      tileUrl.length > 500
    )
      return null;
    return { tileUrl, attribution: credit };
  } catch {
    return null;
  }
}
