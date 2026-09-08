export interface Property {
  id: string;
  name: string;
  city: string;
  neighbourhood: string;
  type: 'Apartment' | 'Villa' | 'Penthouse';
  bedrooms: number;
  area: number;
  price: number;
  status: 'Under construction' | 'Ready to move';
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
