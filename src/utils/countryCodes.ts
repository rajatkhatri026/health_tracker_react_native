import { getLocales } from 'expo-localization';

export interface CountryCode {
  name: string;
  code: string; // e.g. "+91"
  flag: string;
  region: string; // ISO 3166-1 alpha-2, e.g. "IN"
  minDigits: number;
  maxDigits: number;
}

// Digit ranges are the subscriber-number length (excluding country code prefix),
// based on ITU-T E.164 allocations. Most countries use fixed lengths;
// ranges cover mobile vs landline where both are commonly dialled.
export const COUNTRY_CODES: CountryCode[] = [
  { name: 'Afghanistan', code: '+93', flag: '🇦🇫', region: 'AF', minDigits: 9, maxDigits: 9 },
  { name: 'Albania', code: '+355', flag: '🇦🇱', region: 'AL', minDigits: 9, maxDigits: 9 },
  { name: 'Algeria', code: '+213', flag: '🇩🇿', region: 'DZ', minDigits: 9, maxDigits: 9 },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', region: 'AR', minDigits: 10, maxDigits: 11 },
  { name: 'Australia', code: '+61', flag: '🇦🇺', region: 'AU', minDigits: 9, maxDigits: 9 },
  { name: 'Austria', code: '+43', flag: '🇦🇹', region: 'AT', minDigits: 7, maxDigits: 13 },
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩', region: 'BD', minDigits: 10, maxDigits: 10 },
  { name: 'Belgium', code: '+32', flag: '🇧🇪', region: 'BE', minDigits: 8, maxDigits: 9 },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', region: 'BR', minDigits: 10, maxDigits: 11 },
  { name: 'Canada', code: '+1', flag: '🇨🇦', region: 'CA', minDigits: 10, maxDigits: 10 },
  { name: 'Chile', code: '+56', flag: '🇨🇱', region: 'CL', minDigits: 9, maxDigits: 9 },
  { name: 'China', code: '+86', flag: '🇨🇳', region: 'CN', minDigits: 11, maxDigits: 11 },
  { name: 'Colombia', code: '+57', flag: '🇨🇴', region: 'CO', minDigits: 10, maxDigits: 10 },
  { name: 'Croatia', code: '+385', flag: '🇭🇷', region: 'HR', minDigits: 8, maxDigits: 9 },
  { name: 'Czech Republic', code: '+420', flag: '🇨🇿', region: 'CZ', minDigits: 9, maxDigits: 9 },
  { name: 'Denmark', code: '+45', flag: '🇩🇰', region: 'DK', minDigits: 8, maxDigits: 8 },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', region: 'EG', minDigits: 10, maxDigits: 10 },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹', region: 'ET', minDigits: 9, maxDigits: 9 },
  { name: 'Finland', code: '+358', flag: '🇫🇮', region: 'FI', minDigits: 7, maxDigits: 10 },
  { name: 'France', code: '+33', flag: '🇫🇷', region: 'FR', minDigits: 9, maxDigits: 9 },
  { name: 'Germany', code: '+49', flag: '🇩🇪', region: 'DE', minDigits: 7, maxDigits: 11 },
  { name: 'Ghana', code: '+233', flag: '🇬🇭', region: 'GH', minDigits: 9, maxDigits: 9 },
  { name: 'Greece', code: '+30', flag: '🇬🇷', region: 'GR', minDigits: 10, maxDigits: 10 },
  { name: 'Hong Kong', code: '+852', flag: '🇭🇰', region: 'HK', minDigits: 8, maxDigits: 8 },
  { name: 'Hungary', code: '+36', flag: '🇭🇺', region: 'HU', minDigits: 8, maxDigits: 9 },
  { name: 'India', code: '+91', flag: '🇮🇳', region: 'IN', minDigits: 10, maxDigits: 10 },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩', region: 'ID', minDigits: 9, maxDigits: 12 },
  { name: 'Iran', code: '+98', flag: '🇮🇷', region: 'IR', minDigits: 10, maxDigits: 10 },
  { name: 'Iraq', code: '+964', flag: '🇮🇶', region: 'IQ', minDigits: 10, maxDigits: 10 },
  { name: 'Ireland', code: '+353', flag: '🇮🇪', region: 'IE', minDigits: 7, maxDigits: 9 },
  { name: 'Israel', code: '+972', flag: '🇮🇱', region: 'IL', minDigits: 9, maxDigits: 9 },
  { name: 'Italy', code: '+39', flag: '🇮🇹', region: 'IT', minDigits: 9, maxDigits: 11 },
  { name: 'Japan', code: '+81', flag: '🇯🇵', region: 'JP', minDigits: 10, maxDigits: 10 },
  { name: 'Jordan', code: '+962', flag: '🇯🇴', region: 'JO', minDigits: 8, maxDigits: 9 },
  { name: 'Kenya', code: '+254', flag: '🇰🇪', region: 'KE', minDigits: 9, maxDigits: 9 },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼', region: 'KW', minDigits: 8, maxDigits: 8 },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾', region: 'MY', minDigits: 9, maxDigits: 10 },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', region: 'MX', minDigits: 10, maxDigits: 10 },
  { name: 'Morocco', code: '+212', flag: '🇲🇦', region: 'MA', minDigits: 9, maxDigits: 9 },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱', region: 'NL', minDigits: 9, maxDigits: 9 },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿', region: 'NZ', minDigits: 8, maxDigits: 10 },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬', region: 'NG', minDigits: 10, maxDigits: 10 },
  { name: 'Norway', code: '+47', flag: '🇳🇴', region: 'NO', minDigits: 8, maxDigits: 8 },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰', region: 'PK', minDigits: 10, maxDigits: 10 },
  { name: 'Peru', code: '+51', flag: '🇵🇪', region: 'PE', minDigits: 9, maxDigits: 9 },
  { name: 'Philippines', code: '+63', flag: '🇵🇭', region: 'PH', minDigits: 10, maxDigits: 10 },
  { name: 'Poland', code: '+48', flag: '🇵🇱', region: 'PL', minDigits: 9, maxDigits: 9 },
  { name: 'Portugal', code: '+351', flag: '🇵🇹', region: 'PT', minDigits: 9, maxDigits: 9 },
  { name: 'Qatar', code: '+974', flag: '🇶🇦', region: 'QA', minDigits: 8, maxDigits: 8 },
  { name: 'Romania', code: '+40', flag: '🇷🇴', region: 'RO', minDigits: 9, maxDigits: 9 },
  { name: 'Russia', code: '+7', flag: '🇷🇺', region: 'RU', minDigits: 10, maxDigits: 10 },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', region: 'SA', minDigits: 9, maxDigits: 9 },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', region: 'SG', minDigits: 8, maxDigits: 8 },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', region: 'ZA', minDigits: 9, maxDigits: 9 },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', region: 'KR', minDigits: 9, maxDigits: 10 },
  { name: 'Spain', code: '+34', flag: '🇪🇸', region: 'ES', minDigits: 9, maxDigits: 9 },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰', region: 'LK', minDigits: 9, maxDigits: 9 },
  { name: 'Sweden', code: '+46', flag: '🇸🇪', region: 'SE', minDigits: 7, maxDigits: 9 },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭', region: 'CH', minDigits: 9, maxDigits: 9 },
  { name: 'Taiwan', code: '+886', flag: '🇹🇼', region: 'TW', minDigits: 9, maxDigits: 9 },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿', region: 'TZ', minDigits: 9, maxDigits: 9 },
  { name: 'Thailand', code: '+66', flag: '🇹🇭', region: 'TH', minDigits: 9, maxDigits: 9 },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', region: 'TR', minDigits: 10, maxDigits: 10 },
  { name: 'Uganda', code: '+256', flag: '🇺🇬', region: 'UG', minDigits: 9, maxDigits: 9 },
  { name: 'Ukraine', code: '+380', flag: '🇺🇦', region: 'UA', minDigits: 9, maxDigits: 9 },
  {
    name: 'United Arab Emirates',
    code: '+971',
    flag: '🇦🇪',
    region: 'AE',
    minDigits: 9,
    maxDigits: 9,
  },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', region: 'GB', minDigits: 10, maxDigits: 10 },
  { name: 'United States', code: '+1', flag: '🇺🇸', region: 'US', minDigits: 10, maxDigits: 10 },
  { name: 'Venezuela', code: '+58', flag: '🇻🇪', region: 'VE', minDigits: 10, maxDigits: 10 },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳', region: 'VN', minDigits: 9, maxDigits: 10 },
];

const FALLBACK = COUNTRY_CODES.find((c) => c.region === 'US')!;

/**
 * Returns the country matching the device's locale region setting.
 * Falls back to United States. No location permission required —
 * reads the OS language/region setting (e.g. Settings → General → Language & Region).
 */
export const getDefaultCountry = (): CountryCode => {
  const locales = getLocales();
  for (const locale of locales) {
    const region = locale.regionCode?.toUpperCase();
    if (region) {
      const match = COUNTRY_CODES.find((c) => c.region === region);
      if (match) return match;
    }
  }
  return FALLBACK;
};

/**
 * Validates a subscriber phone number (digits only, no country code) against
 * the selected country's min/max digit rules.
 * Returns an error string, or null if valid.
 */
export const validatePhone = (digits: string, country: CountryCode): string | null => {
  if (!digits) return 'Enter your phone number';
  if (!/^\d+$/.test(digits)) return 'Phone number must contain digits only';
  if (digits.length < country.minDigits) {
    return country.minDigits === country.maxDigits
      ? `${country.name} numbers must be ${country.minDigits} digits`
      : `${country.name} numbers must be at least ${country.minDigits} digits`;
  }
  if (digits.length > country.maxDigits) {
    return country.minDigits === country.maxDigits
      ? `${country.name} numbers must be ${country.maxDigits} digits`
      : `${country.name} numbers must be at most ${country.maxDigits} digits`;
  }
  return null;
};
