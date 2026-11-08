/** Maps database error codes raised by the RPC layer to player-facing messages. */
const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Please sign in to continue.',
  ALREADY_IN_GROUP: 'You are already in a squad. Leave it first.',
  NOT_IN_GROUP: 'Create or join a squad first.',
  NOT_GROUP_LEADER: 'Only the squad leader can do that.',
  GROUP_FULL: 'That squad already has 3 members.',
  GROUP_NOT_FOUND: 'That squad no longer exists.',
  CANNOT_INVITE_SELF: 'You cannot invite yourself.',
  ALREADY_MEMBER: 'That player is already in your squad.',
  INVITE_ALREADY_PENDING: 'An invitation is already pending for this player.',
  INVITATION_NOT_FOUND: 'That invitation is no longer available.',
  INVITATION_CLOSED: 'That invitation has already been answered.',
  PLAYER_NOT_FOUND: 'Player not found.',
  NOT_A_MEMBER: 'That player is not in your squad.',
  USE_LEAVE_GROUP: 'Use “Leave squad” to remove yourself.',
  INVALID_SPECIALIZATION: 'Choose a valid specialization.',
  MISSION_NOT_FOUND: 'Unknown mission.',
  GROUP_MISSION_NOT_FOUND: 'That squad mission is not available to you.',
  GROUP_MISSION_CLOSED: 'That squad mission has closed.',
  ALREADY_FLOWN: 'You already completed this squad mission.',
  RUN_NOT_FOUND: 'Mission run not found.',
  RUN_ALREADY_CLOSED: 'This mission was already reported. Rewards are granted once.',
  RUN_TOO_SHORT: 'Mission reported faster than the simulation allows — not verified.',
  INVALID_STATUS: 'Invalid mission outcome.',
  INVALID_CATEGORY: 'Unknown leaderboard category.',
  IMMUTABLE_FIELD: 'Player ID and username cannot be changed.',
};

export function friendlyError(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return 'Something went wrong.';
  const raw = err.message ?? '';
  for (const key of Object.keys(MESSAGES)) if (raw.includes(key)) return MESSAGES[key];
  if (err.code === '42501' || /permission denied/i.test(raw)) return 'You do not have permission to do that.';
  if (/check constraint/i.test(raw)) return 'Some fields are invalid.';
  if (/schema cache|does not exist|Could not find the function/i.test(raw)) {
    return 'Multiplayer database not initialised yet (apply supabase/migrations).';
  }
  return 'Mission Control could not complete that request.';
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
