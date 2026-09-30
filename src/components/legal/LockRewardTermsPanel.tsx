import TermsConsentDialog from "@/components/legal/TermsConsentDialog";
import {
  LOCK_REWARD_ADDITIONAL,
  LOCK_REWARD_MONETARY,
  TERMS_CONSENT_LABEL,
} from "@/lib/legal/termsContent";

interface LockRewardTermsConsentProps {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

export default function LockRewardTermsConsent({
  agreed,
  onAgreedChange,
}: LockRewardTermsConsentProps) {
  return (
    <TermsConsentDialog
      title="Lock Reward — Terms & Conditions"
      monetary={LOCK_REWARD_MONETARY}
      additional={LOCK_REWARD_ADDITIONAL}
      consentLabel={TERMS_CONSENT_LABEL}
      agreed={agreed}
      onAgreedChange={onAgreedChange}
    />
  );
}

export { TERMS_CONSENT_LABEL as LOCK_REWARD_CONSENT_LABEL };
