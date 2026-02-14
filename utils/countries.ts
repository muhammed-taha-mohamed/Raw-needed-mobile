import countriesData from '../data/countries.json';

export interface Country {
  code: string;
  ar: string;
  en: string;
}

const countries = countriesData as Country[];

export function getCountryOptions(lang: 'ar' | 'en'): { value: string; label: string }[] {
  return countries.map((c) => ({
    value: c.code,
    label: lang === 'ar' ? c.ar : c.en,
  }));
}

export function getCountryName(code: string | undefined | null, lang: 'ar' | 'en'): string {
  if (!code) return '';
  const c = countries.find((x) => x.code === code);
  if (c) return lang === 'ar' ? c.ar : c.en;
  return code;
}

export { countries };
