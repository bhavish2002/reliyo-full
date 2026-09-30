/**
 * Legal copy derived from docs/PRODUCT-WORKFLOW.md and backend settlement rules.
 * Do not state features not implemented (e.g. bank payouts, KYC transfers).
 */

export const PLATFORM_FEE_PERCENT = 5;
export const TRUST_DEPOSIT_PERCENT = 10;
export const FORCE_CLOSE_TRUST_FEE_PERCENT = 3;
export const QUIT_GRACE_HOURS = 2;
export const MAX_DISPUTES = 4;
export const DISPUTE_COOLDOWN_HOURS_AFTER_FIRST = [48, 24, 12] as const;
export const FORCE_CLOSE_REQUEST_COOLDOWN_HOURS = 24;
export const INACTIVITY_STRIKE_DAYS = [3, 6, 8] as const;

export const REWARD_AMOUNT_DISCLAIMER =
  "The final reward amount payable is subject to applicable fees and deductions, including the Platform fee and any applicable transaction charges.";

export const TERMS_CONSENT_LABEL =
  "I have read and agree to these terms. I understand that locking funds authorises Reliyo to hold and settle them according to this policy.";

export const LOCK_REWARD_MONETARY = {
  title: "Monetary summary",
  bullets: [
    `You will lock **100% of the task reward** shown above. Funds are **platform-held** until settlement — they are not paid to any user until the task reaches a terminal status.`,
    `On **successful completion** (requestor accepts work): the acceptor receives the reward **minus a ${PLATFORM_FEE_PERCENT}% platform fee**. Your locked reward is released to the acceptor through the platform ledger (bank transfer to acceptors is subject to separate verification when enabled).`,
    `If you **delete the task before any acceptor** accepts it: the task moves to **Deleted** and a **full refund of the locked reward** is initiated. No platform fee applies.`,
    `If the task is **force-closed** (admin-approved requestor force-close or DSP4 admin closure): you receive a **full reward refund plus 70% of the acceptor's trust-deposit penalty**.`,
    `The ${PLATFORM_FEE_PERCENT}% platform fee is **not deducted when you lock the reward** — it applies only on normal close when paying the acceptor.`,
    REWARD_AMOUNT_DISCLAIMER,
  ],
};

export const LOCK_REWARD_ADDITIONAL = {
  title: "Additional terms",
  bullets: [
    "Your task is published only after payment succeeds (Rule Zero). There is no draft state.",
    "The agreed **deadline is a strict commitment**. If the acceptor fails to complete by the deadline, you may request **Force Closure** for admin review.",
    "You may **extend the deadline** only while the task is **Committed** or **In Progress** — not after it is marked Done or enters Dispute.",
    "After the acceptor marks work **Done**, you must **Accept Work** (with a mandatory rating) or **Raise a Dispute** within the review period.",
    `Requestor **inactivity** in Done status: inactivity reminders begin **after the task deadline**. Strikes at **${INACTIVITY_STRIKE_DAYS[0]} / ${INACTIVITY_STRIKE_DAYS[1]} / ${INACTIVITY_STRIKE_DAYS[2]} days** after that point may lead to automatic closure and settlement if you do not act.`,
    `Disputes: up to **${MAX_DISPUTES}** per task. The **first dispute can be raised immediately** once work is marked Done. Later raises wait **${DISPUTE_COOLDOWN_HOURS_AFTER_FIRST.join("h → ")}h**, and the wait restarts whenever the acceptor resubmits work. DSP1–3 are between requestor and acceptor; the **4th dispute (DSP4)** is escalated to admin, who alone may resolve status.`,
    "Send Alert and Request Force Close are subject to platform cooldowns and admin approval where applicable.",
    "Settlement entries are recorded in the platform ledger. Reliyo does not guarantee third-party payment-rail timing.",
  ],
};

export const TRUST_DEPOSIT_MONETARY = {
  title: "Monetary summary",
  bullets: [
    `You will lock a **trust deposit equal to ${TRUST_DEPOSIT_PERCENT}% of the task reward** (amount shown above). This is **separate from the task reward**, which is locked by the requestor.`,
    `On **successful completion** (requestor accepts work): your trust deposit is **refunded in full**. The acceptor receives the task reward minus the ${PLATFORM_FEE_PERCENT}% platform fee — not your deposit.`,
    `If you **quit within ${QUIT_GRACE_HOURS} hours** of accepting, while the task is still **Committed**: your trust deposit is **fully refunded** and the task returns to Open. You cannot accept that same task again.`,
    `On **force-close** (admin-approved requestor force-close or DSP4 admin closure): a **${FORCE_CLOSE_TRUST_FEE_PERCENT}% penalty** is taken from your trust deposit. You receive the remainder. The requestor receives a **full reward refund plus 70% of that penalty**.`,
    `Your deposit is **platform-held** until settlement. Locking the deposit is required to accept the task.`,
    REWARD_AMOUNT_DISCLAIMER,
  ],
};

export const TRUST_DEPOSIT_ADDITIONAL = {
  title: "Additional terms",
  bullets: [
    "After acceptance, your first substantive comment moves the task to **In Progress**.",
    "You may **Mark as Done** when work is complete. The requestor then reviews, accepts, or disputes.",
    `After **${QUIT_GRACE_HOURS} hours** from acceptance, quit is no longer available.`,
    "If the requestor raises a dispute, you may **Submit fix and Mark as Done** again until the **3rd dispute (DSP3)**. On the **4th dispute (DSP4)**, only admin may change task status.",
    "The **deadline is binding**. Missing it may lead to requestor force-close requests and trust-deposit forfeiture if approved.",
    "Requestor inactivity strikes apply only in **Done** status and **after the deadline** — they do not affect your deposit while work is in progress.",
    "Do not attempt to bypass platform payment or settlement rules. Abuse may result in suspension.",
  ],
};

export const MAIN_TERMS_SECTIONS = [
  {
    title: "1. Introduction",
    content:
      "Welcome to Reliyo (“Platform”, “we”, “us”). These Terms of Service (“Terms”) govern access to our task marketplace, including the website, applications, APIs, and related services. By creating an account or using Reliyo, you agree to these Terms and our policies referenced herein, including the product workflow and settlement rules implemented on the Platform.",
  },
  {
    title: "2. What Reliyo is",
    content:
      "Reliyo connects **requestors** (who post tasks with a monetary reward) and **acceptors** (who perform tasks). Reliyo provides identity, task lifecycle, platform-held funds, ledger settlement, disputes tooling, and admin oversight. Reliyo is **not** the employer of acceptors and does not guarantee task outcomes.",
  },
  {
    title: "3. Eligibility and accounts",
    content:
      "You must be at least **18 years old** and able to enter a binding contract. You are responsible for accurate profile information, safeguarding your account (OTP/JWT session), and all activity under your account. We may suspend or terminate accounts for Terms violations, fraud, or abuse.",
  },
  {
    title: "4. Tasks, rewards, and platform-held funds",
    content:
      "Tasks move through defined statuses: Open → Committed → In Progress → Done → Closed / Disputed / Force Closed / Deleted. **Deleted** applies only when a requestor removes a task before it is accepted. **Reward funds** must be locked before a task is published. **Trust deposits** (10% of reward) must be locked before an acceptor is committed. All amounts are **platform-held** until settlement events defined in our workflow. Acceptor payouts are recorded in-platform; **bank transfers require separate verification** when that capability is enabled.",
  },
  {
    title: "5. Fees and settlement (monetary rules)",
    content:
      "**Normal close:** acceptor reward payout is initiated (reward minus the **platform fee**); trust deposit **fully refunded** to acceptor. **Force close:** requestor receives a **full reward refund plus 70% of the acceptor's trust-deposit penalty** (the penalty is **3% of the trust deposit**); the acceptor receives the trust deposit minus that penalty. **Delete before acceptance:** task status becomes **Deleted** and a **full reward refund** is initiated for the requestor. **Quit within 2 hours of accept (Committed → Open):** a **full trust-deposit refund** is initiated for the acceptor. The final reward amount payable is subject to applicable fees and deductions, including the Platform fee and any applicable transaction charges. Fees and refunds are implemented via our ledger; displayed amounts follow each task’s currency.",
  },
  {
    title: "6. Deadlines, extensions, and force closure",
    content:
      "Task deadlines are **strict commitments**. Requestors may extend deadlines only in **Committed** or **In Progress** status. If an acceptor misses the deadline, the requestor may request **Force Closure**; admin approval results in force-close settlement. Acceptor trust deposit may be forfeited as described in Section 5.",
  },
  {
    title: "7. Disputes (DSP1–DSP4)",
    content:
      "Requestors may raise up to **four disputes** per task. The first dispute is available immediately once work is marked Done; later raises wait **48h, then 24h, then 12h**, and the wait resets whenever the acceptor resubmits work. DSP1–3 allow requestor–acceptor resolution cycles; acceptors may return work to Done until DSP3. **DSP4** escalates to admin; acceptors cannot change status during DSP4. Admin resolution may result in Closed, Force Closed, or continued Disputed status per our DSP4 matrix.",
  },
  {
    title: "8. Inactivity (requestor)",
    content:
      "When a task is **Done**, requestor inactivity reminders begin **after the effective deadline**. Progressive strikes at approximately **3, 6, and 8 days** after that anchor may lead to automatic closure and settlement if the requestor does not accept work or dispute.",
  },
  {
    title: "9. Acceptable use and prohibitions",
    content:
      "You may not post fraudulent tasks, circumvent payments, harass users, scrape the Platform, impersonate others, or use Reliyo for unlawful purposes. You must perform accepted work in good faith and communicate respectfully.",
  },
  {
    title: "10. Cancellations, refunds, and chargebacks",
    content:
      "Refunds follow lifecycle rules in Sections 5–8. Initiating chargebacks or payment disputes outside Reliyo’s process may result in account suspension. Admin decisions on force-close and DSP4 are binding for platform settlement.",
  },
  {
    title: "11. Service limitations and liability",
    content:
      "The Platform is provided **“as is”**. We do not guarantee uninterrupted service, specific earnings, or work quality. To the maximum extent permitted by law, Reliyo is not liable for indirect or consequential damages. Total liability is limited to fees paid to Reliyo in the **twelve months** before the claim, where applicable.",
  },
  {
    title: "12. Privacy",
    content:
      "We process account, task, payment, and support data to operate the Platform. See our Privacy Policy for details on collection, use, and retention. Support tickets may be reviewed by administrators; email follow-up may occur outside the Platform.",
  },
  {
    title: "13. Changes",
    content:
      "We may update these Terms or Platform policies. Material changes may be communicated via email or in-app notice. Continued use after the effective date constitutes acceptance.",
  },
  {
    title: "14. Governing law and disputes",
    content:
      "These Terms are governed by the laws of **India**, without regard to conflict-of-law principles. Platform-related disputes should first be raised through Reliyo support. Courts in **Bengaluru, Karnataka** shall have exclusive jurisdiction, subject to mandatory consumer protections.",
  },
  {
    title: "15. Contact",
    content:
      "Questions: legal@reliyo.com or the Contact / Support options on the Platform.",
  },
] as const;
