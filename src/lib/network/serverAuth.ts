/** Server-only helpers re-exported for pages (verification via getClaims). */
export { getVerifiedUserId as getVerifiedUserIdSafe } from '@/lib/supabase/server';
export { getPlayerDossier } from './queries';
