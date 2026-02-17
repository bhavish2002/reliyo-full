export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
  phoneLength: number; // expected digit count
}

export const countries: Country[] = [
  { name: "India", code: "IN", dialCode: "+91", flag: "🇮🇳", phoneLength: 10 },
  { name: "United States", code: "US", dialCode: "+1", flag: "🇺🇸", phoneLength: 10 },
  { name: "United Kingdom", code: "UK", dialCode: "+44", flag: "🇬🇧", phoneLength: 10 },
  { name: "Canada", code: "CA", dialCode: "+1", flag: "🇨🇦", phoneLength: 10 },
  { name: "Australia", code: "AU", dialCode: "+61", flag: "🇦🇺", phoneLength: 9 },
  { name: "Germany", code: "DE", dialCode: "+49", flag: "🇩🇪", phoneLength: 11 },
  { name: "France", code: "FR", dialCode: "+33", flag: "🇫🇷", phoneLength: 9 },
  { name: "Japan", code: "JP", dialCode: "+81", flag: "🇯🇵", phoneLength: 10 },
  { name: "Brazil", code: "BR", dialCode: "+55", flag: "🇧🇷", phoneLength: 11 },
  { name: "South Africa", code: "ZA", dialCode: "+27", flag: "🇿🇦", phoneLength: 9 },
  { name: "United Arab Emirates", code: "AE", dialCode: "+971", flag: "🇦🇪", phoneLength: 9 },
  { name: "Singapore", code: "SG", dialCode: "+65", flag: "🇸🇬", phoneLength: 8 },
  { name: "Nigeria", code: "NG", dialCode: "+234", flag: "🇳🇬", phoneLength: 10 },
  { name: "Mexico", code: "MX", dialCode: "+52", flag: "🇲🇽", phoneLength: 10 },
  { name: "China", code: "CN", dialCode: "+86", flag: "🇨🇳", phoneLength: 11 },
];

export const getCountryByCode = (code: string): Country | undefined =>
  countries.find((c) => c.code === code);

export const getCountryByDialCode = (dialCode: string): Country | undefined =>
  countries.find((c) => c.dialCode === dialCode);
