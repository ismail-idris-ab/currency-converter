/**
 * Static currency catalogue.
 *
 * `flagId` is an ISO-3166 alpha-2 code (lowercase) used to resolve a bundled
 * circular flag asset. Currencies without a single sovereign issuer (EUR, XOF,
 * XAF, XCD) and crypto use a non-ISO id with a dedicated asset.
 *
 * `decimals` drives display rounding. Most fiat is 2; zero-decimal currencies
 * (JPY, KRW, NGN-in-practice is 2 but displayed 0 for large amounts) are 0.
 */
export type CurrencyType = 'fiat' | 'crypto';

export interface Currency {
  readonly code: string;
  readonly name: string;
  readonly country: string;
  readonly flagId: string;
  readonly decimals: number;
  readonly type: CurrencyType;
}

export const CURRENCIES: readonly Currency[] = [
  { code: 'USD', name: 'US Dollar', country: 'United States', flagId: 'us', decimals: 2, type: 'fiat' },
  { code: 'NGN', name: 'Nigerian Naira', country: 'Nigeria', flagId: 'ng', decimals: 2, type: 'fiat' },
  { code: 'EUR', name: 'Euro', country: 'European Union', flagId: 'eu', decimals: 2, type: 'fiat' },
  { code: 'GBP', name: 'British Pound', country: 'United Kingdom', flagId: 'gb', decimals: 2, type: 'fiat' },
  { code: 'GHS', name: 'Ghanaian Cedi', country: 'Ghana', flagId: 'gh', decimals: 2, type: 'fiat' },
  { code: 'KES', name: 'Kenyan Shilling', country: 'Kenya', flagId: 'ke', decimals: 2, type: 'fiat' },
  { code: 'ZAR', name: 'South African Rand', country: 'South Africa', flagId: 'za', decimals: 2, type: 'fiat' },
  { code: 'EGP', name: 'Egyptian Pound', country: 'Egypt', flagId: 'eg', decimals: 2, type: 'fiat' },
  { code: 'CAD', name: 'Canadian Dollar', country: 'Canada', flagId: 'ca', decimals: 2, type: 'fiat' },
  { code: 'AUD', name: 'Australian Dollar', country: 'Australia', flagId: 'au', decimals: 2, type: 'fiat' },
  { code: 'CNY', name: 'Chinese Yuan', country: 'China', flagId: 'cn', decimals: 2, type: 'fiat' },
  { code: 'INR', name: 'Indian Rupee', country: 'India', flagId: 'in', decimals: 2, type: 'fiat' },
  { code: 'JPY', name: 'Japanese Yen', country: 'Japan', flagId: 'jp', decimals: 0, type: 'fiat' },
  { code: 'AED', name: 'UAE Dirham', country: 'United Arab Emirates', flagId: 'ae', decimals: 2, type: 'fiat' },
  { code: 'SAR', name: 'Saudi Riyal', country: 'Saudi Arabia', flagId: 'sa', decimals: 2, type: 'fiat' },
  { code: 'CHF', name: 'Swiss Franc', country: 'Switzerland', flagId: 'ch', decimals: 2, type: 'fiat' },
  { code: 'XOF', name: 'West African CFA Franc', country: 'West Africa', flagId: 'xof', decimals: 0, type: 'fiat' },
  { code: 'XAF', name: 'Central African CFA Franc', country: 'Central Africa', flagId: 'xaf', decimals: 0, type: 'fiat' },
  { code: 'MAD', name: 'Moroccan Dirham', country: 'Morocco', flagId: 'ma', decimals: 2, type: 'fiat' },
  { code: 'TZS', name: 'Tanzanian Shilling', country: 'Tanzania', flagId: 'tz', decimals: 0, type: 'fiat' },
  { code: 'UGX', name: 'Ugandan Shilling', country: 'Uganda', flagId: 'ug', decimals: 0, type: 'fiat' },
  { code: 'RWF', name: 'Rwandan Franc', country: 'Rwanda', flagId: 'rw', decimals: 0, type: 'fiat' },
  { code: 'BRL', name: 'Brazilian Real', country: 'Brazil', flagId: 'br', decimals: 2, type: 'fiat' },
  { code: 'MXN', name: 'Mexican Peso', country: 'Mexico', flagId: 'mx', decimals: 2, type: 'fiat' },
  { code: 'TRY', name: 'Turkish Lira', country: 'Turkey', flagId: 'tr', decimals: 2, type: 'fiat' },
];

const BY_CODE: ReadonlyMap<string, Currency> = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): Currency | undefined {
  return BY_CODE.get(code);
}

/** Currencies shown on a fresh install, per product decision. */
export const DEFAULT_CODES: readonly string[] = ['USD', 'NGN', 'EUR'];
