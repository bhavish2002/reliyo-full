/** Normalize to E.164 using dial code + national digits (digits only in national part). */
export function toPhoneE164(dialCode: string, nationalDigits: string): string {
  const dial = dialCode.replace(/\s/g, '').replace(/^\+?/, '+');
  const normalizedDial = dial.startsWith('+') ? dial : `+${dial}`;
  const national = nationalDigits.replace(/\D/g, '');
  return `${normalizedDial}${national}`;
}

export function nationalDigitsFromE164(phoneE164: string, dialCode: string): string {
  const dial = dialCode.replace(/\D/g, '');
  const full = phoneE164.replace(/\D/g, '');
  if (full.startsWith(dial)) {
    return full.slice(dial.length);
  }
  return full.replace(/^91/, '');
}
