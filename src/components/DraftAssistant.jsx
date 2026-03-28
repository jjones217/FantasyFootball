import { useQuery } from '@tanstack/react-query';
import { getDraftsForLeague, getDraftPicks, getDraft, getAllPlayers } from '../api/sleeper';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const POSITION_COLORS = {
  QB: '#818cf8',
  RB: '#34d399',
  WR: '#60a5fa',
  TE: '#fb923c',
  K: '#a78bfa',
  DEF: '#94a3b8',
};

function gradePickValue(pickNumber, adp) {
  if (!adp) return null;
  return adp - pickNumber; // positive = value (drafted later than ADP), negative = reach
}

function letterGrade(score) {
  if (score >= 15) return { grade: 'A+', color: 'text-emerald-400' };
  if (score >= 8) return { grade: 'A', color: 'text-emerald-400' };
  if (score >= 3) return { grade: 'B+', color: 'text-green-400' };
  if (score >= 0) return { grade: 'B', color: 'text-green-400' };
  if (score >= -5) return { grade: 'C', color: 'text-yellow-400' };
  if (score >= -12) return { grade: 'D', color: 'text-orange-400' };
  return { grade: 'F', color: 'text-red-400' };
}

function overallGrade(picks) {
  const graded = picks.filter((p) => p.valueScore !== null);
  if (!graded.length) return { grade: 'N/A', color: 'text-slate-400' };
  const avg = graded.reduce((sum, p) => sum + p.valueScore, 0) / graded.length;
  return letterGrade(avg);
}

function PickRow({ pick }) {
  const { grade, color } = pick.valueScore !== null
    ? letterGrade(pick.valueScore)
    : { grade: '—', color: 'text-slate-500' };

  const posColor = POSITION_COLORS[pick.position] || 'text-slate-400';
  const valueLabel = pick.valueScore !== null
    ? pick.valueScore > 0
      ? `+${pick.valueScore.toFixed(0)} value`
      : `${pick.valueScore.toFixed(0)} reach`
    : 'No ADP';

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
      <div className="w-10 text-slate-500 text-sm text-right shrink-0">
        #{pick.pickNumber}
      </div>
      <div className={`w-10 text-xs font-bold shrink-0 ${posColor}`}>
        {pick.position}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{pick.name}</div>
        {pick.adp && (
          <div className="text-slate-500 text-xs">ADP {pick.adp.toFixed(0)}</div>
        )}
      </div>
      <div className={`text-xs shrink-0 ${pick.valueScore > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
        {valueLabel}
      </div>
      <div className={`w-8 text-right font-bold shrink-0 ${color}`}>
        {grade}
      </div>
    </div>
  );
}

function PositionChart({ picks }) {
  const counts = picks.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts)
    .map(([pos, count]) => ({ pos, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="pos" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.pos} fill={POSITION_COLORS[entry.pos] || '#64748b'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DraftAssistant({ league, user, onBack }) {
  const draftsQuery = useQuery({
    queryKey: ['drafts', league.league_id],
    queryFn: () => getDraftsForLeague(league.league_id),
  });

  const draftId = draftsQuery.data?.[0]?.draft_id;

  const picksQuery = useQuery({
    queryKey: ['picks', draftId],
    queryFn: () => getDraftPicks(draftId),
    enabled: !!draftId,
  });

  const draftQuery = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => getDraft(draftId),
    enabled: !!draftId,
  });

  const playersQuery = useQuery({
    queryKey: ['players'],
    queryFn: getAllPlayers,
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: !!draftId,
  });

  const isLoading =
    draftsQuery.isLoading ||
    picksQuery.isLoading ||
    draftQuery.isLoading ||
    playersQuery.isLoading;

  const error = draftsQuery.error || picksQuery.error || draftQuery.error;

  let myPicks = [];

  if (picksQuery.data && draftQuery.data && playersQuery.data) {
    const draft = draftQuery.data;
    // draft_order maps user_id -> slot number
    // slot_to_roster_id maps slot number -> roster_id
    const mySlot = draft.draft_order?.[user.user_id];
    const myRosterId = draft.slot_to_roster_id?.[mySlot];

    const scoringType = draft.metadata?.scoring_type
      || (league.scoring_settings?.rec === 1 ? 'ppr'
        : league.scoring_settings?.rec === 0.5 ? 'half_ppr'
        : 'std');

    const adpField = scoringType === 'ppr' ? 'adp_ppr'
      : scoringType === 'half_ppr' ? 'adp_half_ppr'
      : 'adp_std';

    myPicks = picksQuery.data
      .filter((p) => String(p.roster_id) === String(myRosterId))
      .map((p) => {
        const player = playersQuery.data[p.player_id] || {};
        const position = player.position || '?';
        const adp = (position === 'K' || position === 'DEF') ? null
          : (player[adpField] || player.adp_ppr || player.adp_std || null);
        const valueScore = gradePickValue(p.pick_no, adp);
        return {
          pickNumber: p.pick_no,
          name: `${player.first_name || ''} ${player.last_name || p.player_id}`.trim(),
          position,
          team: player.team || '',
          adp,
          valueScore,
        };
      })
      .sort((a, b) => a.pickNumber - b.pickNumber);
  }

  const { grade: overallLetterGrade, color: overallColor } = myPicks.length
    ? overallGrade(myPicks)
    : { grade: '—', color: 'text-slate-400' };

  const bestPicks = [...myPicks]
    .filter((p) => p.valueScore !== null)
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 3);

  const worstPicks = [...myPicks]
    .filter((p) => p.valueScore !== null)
    .sort((a, b) => a.valueScore - b.valueScore)
    .slice(0, 3);

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{league.name}</h1>
        <p className="text-slate-400 text-sm">
          Draft Assistant · {user.display_name}
          {draftQuery.data && (
            <span className="ml-2 text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {(draftQuery.data.metadata?.scoring_type || 'std').toUpperCase()} ADP
            </span>
          )}
        </p>
      </div>

      {isLoading && (
        <div className="text-slate-400 text-center py-20">Loading draft data...</div>
      )}

      {error && (
        <div className="text-red-400 text-center py-20">
          Failed to load draft. This league may not have a completed draft.
        </div>
      )}

      {!isLoading && !error && myPicks.length === 0 && (
        <div className="text-slate-400 text-center py-20">
          No picks found for your team in this draft.
        </div>
      )}

      {!isLoading && myPicks.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Overall grade */}
          <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-6">
            <div className={`text-7xl font-black ${overallColor}`}>
              {overallLetterGrade}
            </div>
            <div>
              <div className="text-white font-semibold text-lg">Overall Draft Grade</div>
              <div className="text-slate-400 text-sm">{myPicks.length} picks analyzed</div>
              <div className="text-slate-500 text-xs mt-1">Based on pick value vs. ADP</div>
            </div>
          </div>

          {/* Best / Worst picks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-emerald-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                Best Picks
              </div>
              {bestPicks.map((p) => (
                <div key={p.pickNumber} className="flex justify-between items-center py-1">
                  <span className="text-white text-sm truncate">{p.name}</span>
                  <span className="text-emerald-400 text-xs ml-2 shrink-0">
                    +{p.valueScore.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-red-400 font-semibold mb-3 text-sm uppercase tracking-wide">
                Biggest Reaches
              </div>
              {worstPicks.map((p) => (
                <div key={p.pickNumber} className="flex justify-between items-center py-1">
                  <span className="text-white text-sm truncate">{p.name}</span>
                  <span className="text-red-400 text-xs ml-2 shrink-0">
                    {p.valueScore.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Position breakdown chart */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-slate-300 font-semibold mb-3 text-sm uppercase tracking-wide">
              Picks by Position
            </div>
            <PositionChart picks={myPicks} />
          </div>

          {/* Full pick list */}
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <span className="text-slate-300 font-semibold text-sm uppercase tracking-wide">
                All Picks
              </span>
            </div>
            {myPicks.map((pick) => (
              <PickRow key={pick.pickNumber} pick={pick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
