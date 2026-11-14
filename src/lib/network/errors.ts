/** Maps database error codes raised by the RPC layer to player-facing messages. */
const MESSAGES: Record<string, string> = {
  NOT_AUTHENTICATED: 'Join the game with a username to continue.',
  ALREADY_IN_GROUP: 'You are already in a squad. Leave it first.',
  NOT_IN_GROUP: 'Create or join a squad first.',
  NOT_GROUP_LEADER: 'Only the squad leader can do that.',
  GROUP_FULL: 'That squad already has 4 members.',
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
  INVALID_CREW_ROLE: 'Choose a valid crew role.',
  IMMUTABLE_FIELD: 'Player ID and username cannot be changed.',
  SQUAD_TOO_SMALL: 'A squad mission needs at least 2 crew members.',
  INVALID_BUDGET: 'Invalid mission budget.',
  INVALID_COMPONENT: 'Unknown spacecraft component.',
  INVALID_ASSIGNMENT: 'The crew plan is invalid.',
  INCOMPLETE_ASSIGNMENT: 'The crew plan must include every squad member.',
  DUPLICATE_ROLE: 'A role can only have one owner.',
  GAME_NOT_FOUND: 'That mission room does not exist.',
  GAME_CLOSED: 'This mission room is closed.',
  GAME_NOT_FINISHED: 'The mission is not finished yet.',
  WRONG_STAGE: 'That action is not available at this stage of the mission.',
  BUILD_INVALID: 'The build has open problems and cannot be frozen yet.',
  WEATHER_NO_GO: 'Weather is NO-GO. The Risk Manager must grant a waiver first.',
  NOT_CLEARED: 'The Flight Director has not declared GO yet.',
  TOO_EARLY: 'Too early to report the end of the ascent.',
  NOT_AVAILABLE: 'That action is not available at this point of the flight.',
  LIMIT_REACHED: 'You have used this action the maximum number of times.',
  NO_FUNDS: 'Not enough unspent budget for that.',
  INVALID_PAYLOAD: 'Invalid request.',
  INVALID_MESSAGE: 'Messages must be 1–500 characters.',
  RATE_LIMITED: 'You are sending messages too fast.',
  UNKNOWN_ACTION: 'Unknown action.',
};

export function friendlyError(err: { message?: string; code?: string; hint?: string } | null | undefined): string {
  if (!err) return 'Something went wrong.';
  const raw = err.message ?? '';
  // "This is another role's job": the database names the roles that may do it in the hint
  if (raw.includes('ROLE_REQUIRED')) return `Not your job — that needs: ${(err.hint ?? '').replace(/^Needs:\s*/, '') || 'another crew role'}.`;
  for (const key of Object.keys(MESSAGES)) if (raw.includes(key)) return MESSAGES[key];
  if (err.code === '42501' || /permission denied/i.test(raw)) return 'You do not have permission to do that.';
  if (/check constraint/i.test(raw)) return 'Some fields are invalid.';
  if (/schema cache|does not exist|Could not find the function/i.test(raw)) {
    return 'Multiplayer isn’t set up on the server yet. Check /status for details.';
  }
  return 'Mission Control could not complete that request.';
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
