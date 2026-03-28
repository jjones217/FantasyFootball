import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUser, getLeagues } from '../api/sleeper';

const CURRENT_SEASON = '2024';

export default function UserLookup({ onLeagueSelect }) {
  const [input, setInput] = useState('');
  const [submittedUsername, setSubmittedUsername] = useState('');

  const userQuery = useQuery({
    queryKey: ['user', submittedUsername],
    queryFn: () => getUser(submittedUsername),
    enabled: !!submittedUsername,
    retry: false,
  });

  const leaguesQuery = useQuery({
    queryKey: ['leagues', userQuery.data?.user_id],
    queryFn: () => getLeagues(userQuery.data.user_id, CURRENT_SEASON),
    enabled: !!userQuery.data?.user_id,
  });

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) setSubmittedUsername(trimmed);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">
          Fantasy Assistant
        </h1>
        <p className="text-slate-400 text-center mb-8">
          Powered by your Sleeper league data
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sleeper username"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-lg font-medium transition-colors"
          >
            Go
          </button>
        </form>

        {userQuery.isError && (
          <p className="text-red-400 text-center">
            User not found. Check your Sleeper username.
          </p>
        )}

        {userQuery.isLoading && (
          <p className="text-slate-400 text-center">Looking up user...</p>
        )}

        {leaguesQuery.isLoading && (
          <p className="text-slate-400 text-center">Loading leagues...</p>
        )}

        {leaguesQuery.data && leaguesQuery.data.length === 0 && (
          <p className="text-slate-400 text-center">
            No leagues found for {CURRENT_SEASON} season.
          </p>
        )}

        {leaguesQuery.data && leaguesQuery.data.length > 0 && (
          <div>
            <p className="text-slate-400 text-sm mb-3">
              Select a league to analyze:
            </p>
            <div className="flex flex-col gap-2">
              {leaguesQuery.data.map((league) => (
                <button
                  key={league.league_id}
                  onClick={() => onLeagueSelect(league, userQuery.data)}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500 text-left px-4 py-3 rounded-lg transition-colors group"
                >
                  <div className="text-white font-medium group-hover:text-indigo-300">
                    {league.name}
                  </div>
                  <div className="text-slate-500 text-sm">
                    {league.total_rosters} teams · {league.settings?.type === 2 ? 'Dynasty' : league.settings?.type === 1 ? 'Keeper' : 'Redraft'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
