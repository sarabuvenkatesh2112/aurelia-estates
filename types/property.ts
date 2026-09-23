export interface Property {
  id: string;
  slug?: string;
  featured?: boolean;
  maxPrice?: number;
  maxArea?: number;
  minArea?: number;
  availability?: string;
  name: string;
  city: string;
  neighbourhood: string;
  type: 'Apartment' | 'Villa' | 'Penthouse';
  bedrooms: number;
  area: number;
  price: number;
  status: string;
  possession: string;
  description: string;
  amenities: string[];
  landmarks: string[];
  image: string;
  developer: string;
}
export interface PropertyFilters {
  city: string;
  type: string;
  bedrooms: string;
  price: string;
}
export interface Recommendation {
  properties: Property[];
  message: string;
}
