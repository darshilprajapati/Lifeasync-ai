import { Country, State } from 'country-state-city';

export interface LocationCountry {
  name: string;
  isoCode: string;
}

export interface LocationState {
  name: string;
  isoCode: string;
}

/**
 * Returns complete list of all countries in the world, sorted alphabetically.
 */
export const getAllCountries = (): LocationCountry[] => {
  return Country.getAllCountries()
    .map((c) => ({
      name: c.name,
      isoCode: c.isoCode
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Returns all first-level administrative regions/states for the specified country name or ISO code.
 */
export const getStatesOfCountry = (countryNameOrCode: string): LocationState[] => {
  if (!countryNameOrCode) return [];
  const trimmed = countryNameOrCode.trim();
  let isoCode = trimmed;

  if (trimmed.length !== 2) {
    const found = Country.getAllCountries().find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (found) {
      isoCode = found.isoCode;
    } else {
      return [];
    }
  }

  return State.getStatesOfCountry(isoCode)
    .map((s) => ({
      name: s.name,
      isoCode: s.isoCode
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Normalizes city names to canonical uppercase with trimmed whitespace.
 * Example: 'Ahmedabad', 'AHMEDABAD', and ' ahmedabad ' -> 'AHMEDABAD'
 */
export const normalizeCity = (city: string | null | undefined): string => {
  if (!city) return '';
  return city.trim().toUpperCase();
};
