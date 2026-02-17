import { z } from "zod";

const nameRegex = /^[A-Za-z][A-Za-z' -]*$/;
const noConsecutiveSpaces = /^(?!.*  )/;

export const signUpSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be under 100 characters.")
    .regex(nameRegex, "Name can only contain letters, spaces, hyphens, and apostrophes.")
    .regex(noConsecutiveSpaces, "Name cannot have consecutive spaces."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required."),
  location: z
    .string()
    .trim()
    .min(3, "Please select or enter a valid location."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .max(255, "Email must be under 255 characters.")
    .transform((v) => v.toLowerCase()),
  countryCode: z.string().min(1, "Country code is required."),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required."),
  countryCode: z.string().min(1, "Country code is required."),
});

export type SignInFormData = z.infer<typeof signInSchema>;

/** Validate phone digits against expected length for a country */
export const validatePhoneForCountry = (
  digits: string,
  expectedLength: number
): string | null => {
  if (!/^\d+$/.test(digits)) return "Phone number must contain only digits.";
  if (digits.length !== expectedLength)
    return `Phone number must be ${expectedLength} digits.`;
  return null;
};

/** Capitalize first letter of each word */
export const capitalizeWords = (str: string): string =>
  str.replace(/\b\w/g, (c) => c.toUpperCase());
