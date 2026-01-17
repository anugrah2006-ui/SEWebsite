import { getAllSiteConfig } from './site-config';
import { defaultSite } from './seo';

export async function loadSiteMeta() {
  const db = await getAllSiteConfig();
  return {
    name: db.SITE_NAME ?? db.site_name ?? defaultSite.name,
    url: db.SITE_URL ?? db.site_url ?? defaultSite.url,
    description:
      db.SITE_DESCRIPTION ?? db.site_description ?? defaultSite.description,
    logo: db.SITE_LOGO_URL ?? db.site_logo_url ?? defaultSite.logo,
    // Feature flags stored in site_config (string values like 'true'/'false')
    privacyConsentEnabled:
      (db.SITE_PRIVACY_CONSENT ?? db.site_privacy_consent ?? 'false') ===
      'true',
    ezoicHeaderEnabled:
      (db.SITE_EZOIC_HEADER ?? db.site_ezoic_header ?? 'false') === 'true',
    raw: db,
  };
}
