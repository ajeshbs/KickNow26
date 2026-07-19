// Client-safe constants (no Cloudflare imports) shared by settings + watch UI.

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'UK', name: 'UK', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'OTHER', name: 'Other', flag: '🌍' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function getCountry(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1];
}

/** Domestic broadcaster country per competition — its channels are listed first. */
export const DOMESTIC_COUNTRY: Record<string, string> = {
  PD: 'ES',
  PL: 'UK',
  BL1: 'DE',
  SA: 'IT',
  FL1: 'FR',
  // CL: no single domestic country
};
