import { useEffect, useState } from "react";
import "./ClubRankings.css";

interface RankingEntry {
  globalId: string;
  name: string;
  setsWon: number;
  matchesPlayed: number;
  wins: number;
}

interface ClubRankingsProps {
  clubId: string;
}

export function ClubRankings({ clubId }: ClubRankingsProps) {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("token");
    fetch(`/api/clubs/${clubId}/rankings`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRankings(data.rankings ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading) {
    return <div className="club-rankings-loading">Carregando ranking...</div>;
  }

  if (error) {
    return <div className="club-rankings-error">{error}</div>;
  }

  if (rankings.length === 0) {
    return (
      <div className="club-rankings-empty">
        Nenhuma partida finalizada ainda. O ranking aparecerá após a primeira
        partida concluída.
      </div>
    );
  }

  return (
    <div className="club-rankings">
      <h2 className="club-rankings-title">Ranking Intraclubes</h2>
      <p className="club-rankings-subtitle">Sets acumulados em partidas finalizadas</p>
      <table className="club-rankings-table">
        <thead>
          <tr>
            <th className="col-pos">#</th>
            <th className="col-name">Atleta</th>
            <th className="col-sets">Sets</th>
            <th className="col-wins">Vitórias</th>
            <th className="col-matches">Partidas</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((entry, index) => (
            <tr
              key={entry.globalId}
              className={index < 3 ? `rank-top rank-top-${index + 1}` : ""}
            >
              <td className="col-pos">
                {index === 0 && <span className="rank-medal">🥇</span>}
                {index === 1 && <span className="rank-medal">🥈</span>}
                {index === 2 && <span className="rank-medal">🥉</span>}
                {index >= 3 && <span className="rank-num">{index + 1}</span>}
              </td>
              <td className="col-name">{entry.name}</td>
              <td className="col-sets">{entry.setsWon}</td>
              <td className="col-wins">{entry.wins}</td>
              <td className="col-matches">{entry.matchesPlayed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
