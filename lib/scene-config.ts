export type Vec3 = [number, number, number];
export const sceneChapters = [
  {
    at: 0,
    name: 'Arrival',
    title: 'A new perspective on extraordinary living.',
    text: 'Aurelia Residence. An original vision, composed around light, landscape and the luxury of space.',
    position: [122, 111, 158],
    target: [-23, 45, 0],
    fov: 42,
  },
  {
    at: 0.18,
    name: 'Approach',
    title: 'A quieter kind of landmark.',
    text: '26 levels. A planted podium. A private retreat above the city. A fictional architectural concept, imagined for India.',
    position: [93, 79, 131],
    target: [-17, 43, 0],
    fov: 40,
  },
  {
    at: 0.36,
    name: 'Architecture',
    title: 'Designed with intention.',
    text: 'Deep terraces temper the sun. Slender bronze fins frame the view. Honest materials give the silhouette its quiet rhythm.',
    position: [54, 70, 125],
    target: [-13, 47, 0],
    fov: 38,
  },
  {
    at: 0.57,
    name: 'Residences',
    title: 'A world above the everyday.',
    text: 'Explore two considered residences, with generous rooms and a more expansive outlook.',
    position: [54, 87, 106],
    target: [-13, 65, 0],
    fov: 37,
  },
  {
    at: 0.77,
    name: 'Lifestyle',
    title: 'The everyday, elevated.',
    text: 'A private club. A long, quiet swim. A landscaped court that brings a welcome pause to the day.',
    position: [79, 40, 88],
    target: [-13, 15, 4],
    fov: 41,
  },
  {
    at: 1,
    name: 'Your next chapter',
    title: 'Find your own perspective.',
    text: 'From an architectural vision to a place of your own. Discover the Aurelia collection.',
    position: [122, 111, 158],
    target: [-23, 45, 0],
    fov: 42,
  },
] satisfies {
  at: number;
  name: string;
  title: string;
  text: string;
  position: Vec3;
  target: Vec3;
  fov: number;
}[];
export const floors = [
  {
    level: 18,
    title: '3 BHK Residence',
    area: '1,845 sq.ft.',
    price: '₹1.18 Cr onwards',
    y: 61,
  },
  {
    level: 22,
    title: '4 BHK Residence',
    area: '2,680 sq.ft.',
    price: '₹1.95 Cr onwards',
    y: 74.6,
  },
];
export const hotspots = [
  {
    id: 'club',
    index: '01',
    name: 'Private club',
    anchor: 'Hotspot_PrivateClub',
    position: [-22, 8, 12] as Vec3,
    text: 'A residents’ pavilion for quiet conversations, shared tables and unhurried evenings.',
    chapters: [4],
  },
  {
    id: 'sky',
    index: '02',
    name: 'Sky terrace',
    anchor: 'Hotspot_SkyTerrace',
    position: [0, 93, 0] as Vec3,
    text: 'A planted retreat at the crown, shaded by a warm timber pergola and open to the horizon.',
    chapters: [2, 3],
  },
  {
    id: 'homes',
    index: '03',
    name: 'Residences',
    anchor: 'Hotspot_Residences',
    position: [-11, 67, 8] as Vec3,
    text: 'Deep balconies, sheltered glazing and generous three- and four-bedroom homes.',
    chapters: [3],
  },
  {
    id: 'court',
    index: '04',
    name: 'Landscaped court',
    anchor: 'Hotspot_Landscape',
    position: [24, 3, 16] as Vec3,
    text: 'Layered planting and a reflecting pool create a gentle transition between city and home.',
    chapters: [4],
  },
];
export function smoothUnit(n: number) {
  const x = Math.max(0, Math.min(1, n));
  return x * x * (3 - 2 * x);
}
export function sceneSegment(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  const next = sceneChapters.findIndex((c) => c.at > p);
  const a = next < 0 ? sceneChapters.length - 2 : Math.max(0, next - 1);
  return {
    a,
    b: a + 1,
    t: smoothUnit(
      (p - sceneChapters[a].at) /
        (sceneChapters[a + 1].at - sceneChapters[a].at),
    ),
  };
}
export function sceneChapter(progress: number) {
  return progress > 0.91
    ? 5
    : progress > 0.67
      ? 4
      : progress > 0.46
        ? 3
        : progress > 0.27
          ? 2
          : progress > 0.09
            ? 1
            : 0;
}
export type SceneClock = {
  value: number;
  invalidate: () => void;
  connect: (callback: () => void) => void;
};
