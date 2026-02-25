import { logger } from '../utils/logger.js';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export interface CitySearchResult {
  displayName: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 10000;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      headers: {
        'User-Agent': 'eTurtle-Logistics/1.0',
        'Accept-Language': 'en',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export class GeocodingService {
  async searchCities(query: string, countryCode?: string): Promise<CitySearchResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '10',
      featuretype: 'city',
    });

    if (countryCode) {
      params.set('countrycodes', countryCode.toLowerCase());
    }

    const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

    try {
      const response = await rateLimitedFetch(url);
      if (!response.ok) {
        logger.error(`Nominatim city search failed: ${response.status}`);
        return [];
      }

      const results: NominatimResult[] = await response.json() as NominatimResult[];

      return results
        .filter((r) => r.address?.city || r.address?.town || r.address?.village)
        .map((r) => ({
          displayName: r.display_name,
          city: r.address?.city ?? r.address?.town ?? r.address?.village ?? '',
          state: r.address?.state,
          country: r.address?.country ?? '',
          countryCode: r.address?.country_code ?? '',
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
        }));
    } catch (error) {
      logger.error(`Nominatim city search error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async geocodeAddress(query: string, city?: string): Promise<GeocodingResult[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const searchQuery = city ? `${query}, ${city}` : query;

    const params = new URLSearchParams({
      q: searchQuery,
      format: 'json',
      addressdetails: '1',
      limit: '5',
    });

    const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

    try {
      const response = await rateLimitedFetch(url);
      if (!response.ok) {
        logger.error(`Nominatim geocode failed: ${response.status}`);
        return [];
      }

      const results: NominatimResult[] = await response.json() as NominatimResult[];

      return results.map((r) => ({
        displayName: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      }));
    } catch (error) {
      logger.error(`Nominatim geocode error: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}
