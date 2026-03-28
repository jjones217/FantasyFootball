const BASE = 'https://api.sleeper.app/v1';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Sleeper API error: ${res.status} ${path}`);
  return res.json();
}

export async function getUser(username) {
  return get(`/user/${username}`);
}

export async function getLeagues(userId, season) {
  return get(`/user/${userId}/leagues/nfl/${season}`);
}

export async function getDraftsForLeague(leagueId) {
  return get(`/league/${leagueId}/drafts`);
}

export async function getDraftPicks(draftId) {
  return get(`/draft/${draftId}/picks`);
}

export async function getDraft(draftId) {
  return get(`/draft/${draftId}`);
}

// Returns a map of player_id -> player object
// This is a large payload (~5MB) — caller should cache it
export async function getAllPlayers() {
  return get('/players/nfl');
}
