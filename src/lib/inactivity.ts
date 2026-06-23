/**
 * @deprecated Client-side inactivity mutations removed (Phase 1).
 * Server job: `POST /admin/jobs/inactivity/process-due` + timeline `sla_warning` events.
 * Use `inactivityBannerFromTimeline` for read-only UI banners.
 */
export { inactivityBannerFromTimeline as checkInactivityBanner } from "./inactivityDisplay";
