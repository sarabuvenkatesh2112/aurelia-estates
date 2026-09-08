import { properties } from '@/data/properties';
import type { PropertyFilters, Recommendation } from '@/types/property';
export const emptyFilters: PropertyFilters = {
  city: '',
  type: '',
  bedrooms: '',
  price: '',
};
export const formatPrice = (price: number) =>
  price < 1
    ? `₹${Math.round(price * 100)} Lakhs`
    : `₹${price.toFixed(2).replace(/0$/, '').replace(/\.$/, '')} Cr`;
export function filterProperties(filters: PropertyFilters) {
  return properties.filter(
    (p) =>
      (!filters.city || p.city === filters.city) &&
      (!filters.type || p.type === filters.type) &&
      (!filters.bedrooms || p.bedrooms === Number(filters.bedrooms)) &&
      (!filters.price || p.price <= Number(filters.price)),
  );
}
// Local intent adapter. Replace this function with the future recommendation service.
export function recommendProperties(prompt: string): Recommendation {
  const text = prompt.toLowerCase();
  const city =
    [...new Set(properties.map((p) => p.city))].find((c) =>
      text.includes(c.toLowerCase()),
    ) || (text.includes('vizag') ? 'Visakhapatnam' : '');
  const bedrooms = text.match(/(\d)\s*(?:bhk|bed)/)?.[1] || '';
  const budget = text.match(
    /(?:under|below|up to|budget)\s*₹?\s*([\d.]+)\s*(cr|crore|lakh|lac)/,
  );
  const price = budget
    ? String(Number(budget[1]) * (/lakh|lac/.test(budget[2]) ? 0.01 : 1))
    : '';
  const type = text.includes('villa')
    ? 'Villa'
    : text.includes('penthouse')
      ? 'Penthouse'
      : text.includes('apartment')
        ? 'Apartment'
        : '';
  const matches = filterProperties({ city, bedrooms, price, type }).slice(0, 3);
  return {
    properties: matches,
    message: matches.length
      ? `Here are ${matches.length} considered ${matches.length === 1 ? 'match' : 'matches'} from our concept collection. ${!city && !bedrooms && !price && !type ? 'Try adding a city, BHK and a budget in Cr or Lakhs to refine them.' : 'All prices and project details are illustrative.'}`
      : 'No exact matches in our eight-residence concept collection. Try a wider budget or another city. This local preview understands city, BHK, property type and budgets in Cr or Lakhs.',
  };
}
