import TermsConsentDialog from "@/components/legal/TermsConsentDialog";
import {
  TRUST_DEPOSIT_ADDITIONAL,
  TRUST_DEPOSIT_MONETARY,
  TERMS_CONSENT_LABEL,
} from "@/lib/legal/termsContent";

interface TrustDepositTermsConsentProps {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

export default function TrustDepositTermsConsent({
  agreed,
  onAgreedChange,
}: TrustDepositTermsConsentProps) {
  return (
    <TermsConsentDialog
      title="Trust Deposit — Terms & Conditions"
      monetary={TRUST_DEPOSIT_MONETARY}
      additional={TRUST_DEPOSIT_ADDITIONAL}
      consentLabel={TERMS_CONSENT_LABEL}
      agreed={agreed}
      onAgreedChange={onAgreedChange}
    />
  );
}

export { TERMS_CONSENT_LABEL as TRUST_DEPOSIT_CONSENT_LABEL };
