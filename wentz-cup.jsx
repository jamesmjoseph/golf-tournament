import { useState } from "react";

// ─── Lederach Golf Club Scorecard (Par 71) ───────────────────────────────────
const HOLES = [
  { hole: 1,  par: 4, hcp: 7,  yards: 420 },
  { hole: 2,  par: 4, hcp: 3,  yards: 445 },
  { hole: 3,  par: 3, hcp: 15, yards: 185 },
  { hole: 4,  par: 5, hcp: 1,  yards: 560 },
  { hole: 5,  par: 4, hcp: 11, yards: 395 },
  { hole: 6,  par: 4, hcp: 5,  yards: 430 },
  { hole: 7,  par: 3, hcp: 17, yards: 155 },
  { hole: 8,  par: 5, hcp: 9,  yards: 540 },
  { hole: 9,  par: 4, hcp: 13, yards: 375 },
  { hole: 10, par: 4, hcp: 14, yards: 411 },
  { hole: 11, par: 4, hcp: 4,  yards: 399 },
  { hole: 12, par: 5, hcp: 2,  yards: 554 },
  { hole: 13, par: 4, hcp: 12, yards: 392 },
  { hole: 14, par: 3, hcp: 16, yards: 233 },
  { hole: 15, par: 4, hcp: 8,  yards: 469 },
  { hole: 16, par: 3, hcp: 18, yards: 145 },
  { hole: 17, par: 4, hcp: 6,  yards: 452 },
  { hole: 18, par: 4, hcp: 10, yards: 328 },
];

const PAR_TOTAL = HOLES.reduce((s, h) => s + h.par, 0);
const CTP_HOLES = HOLES.filter(h => h.par === 3).map(h => h.hole);

const TEAM_COLORS  = { "Upper Wentz": "#2471a3", "Lower Wentz": "#a93226" };
const TEAM_LIGHT   = { "Upper Wentz": "#7fb3d3", "Lower Wentz": "#f1948a" };

// 4 matches: each has 2 upper + 2 lower player slots
const initMatches = () => [
  { id: 0, label: "Match 1", upper: ["",""], lower: ["",""] },
  { id: 1, label: "Match 2", upper: ["",""], lower: ["",""] },
  { id: 2, label: "Match 3", upper: ["",""], lower: ["",""] },
  { id: 3, label: "Match 4", upper: ["",""], lower: ["",""] },
];

const initPlayer = (team, idx) => ({
  id: `${team}-${idx}`,
  name: "",
  handicap: "",
  team,
});

// Net score for a player on a hole (WHS stroke allocation)
function netScore(rawScore, playerHcp, holeHcp) {
  if (rawScore === undefined || rawScore === null) return null;
  const strokes = Math.floor(playerHcp / 18) + (holeHcp <= (playerHcp % 18) ? 1 : 0);
  return rawScore - strokes;
}

// Best net of a pair on a hole (lower is better)
function pairBestNet(p1id, p2id, holeNum, players, scores) {
  const h = HOLES[holeNum - 1];
  const nets = [p1id, p2id].map(pid => {
    const pl = players.find(p => p.id === pid);
    if (!pl || !pl.name) return null;
    const raw = scores[pid]?.[holeNum];
    if (raw === undefined) return null;
    return netScore(raw, parseInt(pl.handicap) || 0, h.hcp);
  }).filter(n => n !== null);
  return nets.length ? Math.min(...nets) : null;
}

// Hole result for one match: returns { upper: pts, lower: pts }
function holeMatchPoints(match, holeNum, players, scores) {
  const u = pairBestNet(match.upper[0], match.upper[1], holeNum, players, scores);
  const l = pairBestNet(match.lower[0], match.lower[1], holeNum, players, scores);
  if (u === null || l === null) return null;
  if (u < l) return { upper: 1, lower: 0 };
  if (l < u) return { upper: 0, lower: 1 };
  return { upper: 0.5, lower: 0.5 };
}

// Full match totals
function matchTotals(match, players, scores) {
  let upper = 0, lower = 0;
  HOLES.forEach(h => {
    const r = holeMatchPoints(match, h.hole, players, scores);
    if (r) { upper += r.upper; lower += r.lower; }
  });
  return { upper, lower };
}

const VIEWS = ["Setup", "Matches", "Live Scoring", "Leaderboard", "Bonuses", "Summary"];

export default function WentzCup() {
  const [view, setView]         = useState("Setup");
  const [players, setPlayers]   = useState([
    ...Array(8).fill(null).map((_, i) => initPlayer("Upper Wentz", i)),
    ...Array(8).fill(null).map((_, i) => initPlayer("Lower Wentz", i)),
  ]);
  const [matches, setMatches]   = useState(initMatches());
  const [scores, setScores]     = useState({});
  const [activeMatch, setActiveMatch] = useState(0);
  const [currentHole, setCurrentHole] = useState(1);
  const [scat, setScat]         = useState({ enabled: true, amount: 5 });
  const [scatWinners, setScatWinners] = useState({});
  const [ctpWinners, setCtpWinners]   = useState({});

  const upperPlayers = players.filter(p => p.team === "Upper Wentz");
  const lowerPlayers = players.filter(p => p.team === "Lower Wentz");

  function setPlayerField(id, field, val) {
    setPlayers(ps => ps.map(p => p.id === id ? { ...p, [field]: val } : p));
  }
  function setScore(pid, hole, val) {
    setScores(s => ({
      ...s,
      [pid]: { ...(s[pid] || {}), [hole]: val === "" ? undefined : parseInt(val) },
    }));
  }

  // Overall Wentz Cup: sum of match points across all 4 matches
  function cupTotals() {
    let upper = 0, lower = 0;
    matches.forEach(m => {
      const t = matchTotals(m, players, scores);
      upper += t.upper;
      lower += t.lower;
    });
    return { upper, lower, total: upper + lower };
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: "#0d1f14", minHeight: "100vh", color: "#f0ede6" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(160deg, #0d1f14 0%, #163322 60%, #0d1f14 100%)", borderBottom: "2px solid #c8a84b", padding: "16px 16px 0" }}>
        <div style={{ textAlign: "center", paddingBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#c8a84b", textTransform: "uppercase", marginBottom: 4 }}>July 3rd · Lederach Golf Club · Harleysville PA</div>
          <div style={{ fontSize: 26, fontWeight: "bold", letterSpacing: 3, color: "#f0ede6" }}>⛳ THE WENTZ CUP</div>
          <div style={{ fontSize: 12, letterSpacing: 2, marginTop: 3 }}>
            <span style={{ color: TEAM_LIGHT["Upper Wentz"] }}>▲ UPPER WENTZ</span>
            <span style={{ color: "#c8a84b", margin: "0 10px" }}>vs</span>
            <span style={{ color: TEAM_LIGHT["Lower Wentz"] }}>LOWER WENTZ ▼</span>
          </div>
          <div style={{ fontSize: 10, color: "#666", marginTop: 4 }}>4 Matches · 2v2 Best Ball · 1 pt/hole · 0.5 halved</div>
        </div>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: "0 0 auto", padding: "9px 12px", fontSize: 11, fontWeight: "bold",
              letterSpacing: 1, textTransform: "uppercase", border: "none", cursor: "pointer",
              borderBottom: view === v ? "3px solid #c8a84b" : "3px solid transparent",
              background: "transparent", color: view === v ? "#c8a84b" : "#777",
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "20px 12px" }}>
        {view === "Setup"        && <SetupView players={players} setPlayerField={setPlayerField} upperPlayers={upperPlayers} lowerPlayers={lowerPlayers} />}
        {view === "Matches"      && <MatchesView matches={matches} setMatches={setMatches} players={players} scores={scores} matchTotals={matchTotals} setActiveMatch={setActiveMatch} setView={setView} />}
        {view === "Live Scoring" && <ScoringView matches={matches} players={players} scores={scores} setScore={setScore} activeMatch={activeMatch} setActiveMatch={setActiveMatch} currentHole={currentHole} setCurrentHole={setCurrentHole} holeMatchPoints={holeMatchPoints} matchTotals={matchTotals} />}
        {view === "Leaderboard"  && <LeaderboardView matches={matches} players={players} scores={scores} matchTotals={matchTotals} cupTotals={cupTotals} holeMatchPoints={holeMatchPoints} />}
        {view === "Bonuses"      && <BonusView scat={scat} setScat={setScat} scatWinners={scatWinners} setScatWinners={setScatWinners} ctpWinners={ctpWinners} setCtpWinners={setCtpWinners} players={players} />}
        {view === "Summary"      && <SummaryView matches={matches} players={players} scores={scores} matchTotals={matchTotals} cupTotals={cupTotals} scat={scat} scatWinners={scatWinners} ctpWinners={ctpWinners} />}
      </div>
    </div>
  );
}

// ─── SETUP ────────────────────────────────────────────────────────────────────
function SetupView({ players, setPlayerField, upperPlayers, lowerPlayers }) {
  return (
    <div>
      <SectionHeader title="Player Roster" subtitle="16 players · 8 per side · Enter name & course handicap" />
      {[["Upper Wentz", upperPlayers], ["Lower Wentz", lowerPlayers]].map(([team, tp]) => (
        <div key={team} style={{ marginBottom: 28 }}>
          <TeamLabel team={team} />
          <div style={{ display: "grid", gap: 8 }}>
            {tp.map((p, i) => (
              <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 14px", border: `1px solid ${TEAM_COLORS[team]}33` }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: TEAM_COLORS[team], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold", flexShrink: 0 }}>{i + 1}</div>
                <input placeholder={`Player ${i + 1}`} value={p.name} onChange={e => setPlayerField(p.id, "name", e.target.value)}
                  style={{ flex: 1, background: "transparent", border: "none", borderBottom: "1px solid #444", color: "#f0ede6", fontSize: 15, padding: "4px 0", outline: "none", fontFamily: "Georgia,serif" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: "#777" }}>HCP</span>
                  <input type="number" min="0" max="54" placeholder="—" value={p.handicap} onChange={e => setPlayerField(p.id, "handicap", e.target.value)}
                    style={{ width: 46, background: "rgba(255,255,255,0.08)", border: "1px solid #444", borderRadius: 6, color: "#c8a84b", fontSize: 15, fontWeight: "bold", textAlign: "center", padding: "4px 0", outline: "none", fontFamily: "Georgia,serif" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <SectionHeader title="Course Scorecard" subtitle="Lederach Golf Club · Par 71 · 7,023 yds" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#163322" }}>
              {["Hole","Par","HCP","Yds"].map(h => <th key={h} style={{ padding: "8px 8px", textAlign: "center", color: "#c8a84b", letterSpacing: 1 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {HOLES.map((h, i) => (
              <tr key={h.hole} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.025)" : "transparent" }}>
                <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: "bold", color: h.hole === 10 ? "#aaa" : h.hole < 10 ? "#7fb3d3" : "#f0ede6" }}>{h.hole}{h.hole === 10 ? " ↩" : ""}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: h.par === 3 ? "#58d68d" : h.par === 5 ? "#f0a500" : "#f0ede6" }}>{h.par}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#777" }}>{h.hcp}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", color: "#777" }}>{h.yards}</td>
              </tr>
            ))}
            <tr style={{ background: "#163322", fontWeight: "bold" }}>
              <td style={{ padding: "8px", textAlign: "center", color: "#c8a84b" }}>TOT</td>
              <td style={{ padding: "8px", textAlign: "center", color: "#c8a84b" }}>{PAR_TOTAL}</td>
              <td colSpan={2} style={{ padding: "8px", textAlign: "center", color: "#777" }}>7,023 yds</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MATCHES SETUP ─────────────────────────────────────────────────────────────
function MatchesView({ matches, setMatches, players, scores, matchTotals, setActiveMatch, setView }) {
  const upperPlayers = players.filter(p => p.team === "Upper Wentz" && p.name);
  const lowerPlayers = players.filter(p => p.team === "Lower Wentz" && p.name);

  function setMatchSlot(matchId, side, slot, pid) {
    setMatches(ms => ms.map(m => {
      if (m.id !== matchId) return m;
      const arr = [...m[side]];
      arr[slot] = pid;
      return { ...m, [side]: arr };
    }));
  }

  return (
    <div>
      <SectionHeader title="Match Pairings" subtitle="Assign 2 Upper + 2 Lower players per match · 4 matches total" />
      <div style={{ display: "grid", gap: 16 }}>
        {matches.map(m => {
          const totals = matchTotals(m, players, scores);
          const hasScores = totals.upper + totals.lower > 0;
          return (
            <div key={m.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16, border: "1px solid #c8a84b33" }}>
              {/* Match header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: "bold", color: "#c8a84b", letterSpacing: 2 }}>{m.label}</div>
                {hasScores && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: TEAM_LIGHT["Upper Wentz"], fontWeight: "bold" }}>{totals.upper}</span>
                    <span style={{ color: "#555" }}>–</span>
                    <span style={{ color: TEAM_LIGHT["Lower Wentz"], fontWeight: "bold" }}>{totals.lower}</span>
                    <button onClick={() => { setActiveMatch(m.id); setView("Live Scoring"); }}
                      style={{ marginLeft: 8, padding: "4px 10px", borderRadius: 6, border: "1px solid #c8a84b", background: "transparent", color: "#c8a84b", fontSize: 11, cursor: "pointer" }}>Score →</button>
                  </div>
                )}
                {!hasScores && m.upper[0] && m.upper[1] && m.lower[0] && m.lower[1] && (
                  <button onClick={() => { setActiveMatch(m.id); setView("Live Scoring"); }}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #c8a84b", background: "#c8a84b22", color: "#c8a84b", fontSize: 12, cursor: "pointer" }}>▶ Score</button>
                )}
              </div>

              {/* Pairings grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {/* Upper pair */}
                <div>
                  <div style={{ fontSize: 10, color: TEAM_LIGHT["Upper Wentz"], letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>▲ Upper Wentz</div>
                  {[0, 1].map(slot => (
                    <select key={slot} value={m.upper[slot]} onChange={e => setMatchSlot(m.id, "upper", slot, e.target.value)}
                      style={{ width: "100%", marginBottom: 6, background: "#163322", border: `1px solid ${m.upper[slot] ? TEAM_COLORS["Upper Wentz"] : "#333"}`, borderRadius: 6, color: m.upper[slot] ? "#f0ede6" : "#666", padding: "8px 10px", fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="">— Select player —</option>
                      {upperPlayers.map(p => (
                        <option key={p.id} value={p.id}
                          disabled={m.upper.includes(p.id) && m.upper[slot] !== p.id}>
                          {p.name} (HCP {p.handicap || 0})
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
                {/* Lower pair */}
                <div>
                  <div style={{ fontSize: 10, color: TEAM_LIGHT["Lower Wentz"], letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Lower Wentz ▼</div>
                  {[0, 1].map(slot => (
                    <select key={slot} value={m.lower[slot]} onChange={e => setMatchSlot(m.id, "lower", slot, e.target.value)}
                      style={{ width: "100%", marginBottom: 6, background: "#163322", border: `1px solid ${m.lower[slot] ? TEAM_COLORS["Lower Wentz"] : "#333"}`, borderRadius: 6, color: m.lower[slot] ? "#f0ede6" : "#666", padding: "8px 10px", fontSize: 13, outline: "none", cursor: "pointer" }}>
                      <option value="">— Select player —</option>
                      {lowerPlayers.map(p => (
                        <option key={p.id} value={p.id}
                          disabled={m.lower.includes(p.id) && m.lower[slot] !== p.id}>
                          {p.name} (HCP {p.handicap || 0})
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              {/* Show named pairing */}
              {m.upper[0] && m.upper[1] && m.lower[0] && m.lower[1] && (() => {
                const u0 = players.find(p => p.id === m.upper[0]);
                const u1 = players.find(p => p.id === m.upper[1]);
                const l0 = players.find(p => p.id === m.lower[0]);
                const l1 = players.find(p => p.id === m.lower[1]);
                return (
                  <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 8, fontSize: 12, color: "#aaa", textAlign: "center" }}>
                    <span style={{ color: TEAM_LIGHT["Upper Wentz"] }}>{u0?.name} & {u1?.name}</span>
                    <span style={{ color: "#555", margin: "0 8px" }}>vs</span>
                    <span style={{ color: TEAM_LIGHT["Lower Wentz"] }}>{l0?.name} & {l1?.name}</span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIVE SCORING ─────────────────────────────────────────────────────────────
function ScoringView({ matches, players, scores, setScore, activeMatch, setActiveMatch, currentHole, setCurrentHole, holeMatchPoints, matchTotals }) {
  const match = matches[activeMatch];
  const hole  = HOLES[currentHole - 1];
  const totals = matchTotals(match, players, scores);
  const holeResult = holeMatchPoints(match, currentHole, players, scores);

  // All 4 players in this match
  const matchPlayerIds = [...match.upper, ...match.lower].filter(Boolean);
  const matchPlayers = matchPlayerIds.map(pid => players.find(p => p.id === pid)).filter(Boolean);

  function playerNet(pid) {
    const p = players.find(pl => pl.id === pid);
    if (!p) return null;
    const raw = scores[pid]?.[currentHole];
    if (raw === undefined) return null;
    return netScore(raw, parseInt(p.handicap) || 0, hole.hcp);
  }

  function strokesGiven(pid) {
    const p = players.find(pl => pl.id === pid);
    if (!p) return 0;
    const hcp = parseInt(p.handicap) || 0;
    return Math.floor(hcp / 18) + (hole.hcp <= (hcp % 18) ? 1 : 0);
  }

  // Running match status string
  function matchStatus() {
    const diff = totals.upper - totals.lower;
    const holesPlayed = HOLES.filter(h => holeMatchPoints(match, h.hole, players, scores) !== null).length;
    if (holesPlayed === 0) return "All Square";
    if (diff === 0) return "All Square";
    const side = diff > 0 ? "Upper" : "Lower";
    return `${side} leads ${Math.abs(diff)}–${Math.min(totals.upper, totals.lower)}`;
  }

  return (
    <div>
      {/* Match Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {matches.map(m => {
          const t = matchTotals(m, players, scores);
          const active = m.id === activeMatch;
          return (
            <button key={m.id} onClick={() => setActiveMatch(m.id)} style={{
              padding: "6px 14px", borderRadius: 8, border: `2px solid ${active ? "#c8a84b" : "#333"}`,
              background: active ? "#c8a84b" : "rgba(255,255,255,0.04)", color: active ? "#0d1f14" : "#aaa",
              fontWeight: "bold", fontSize: 12, cursor: "pointer",
            }}>
              {m.label}
              {(t.upper + t.lower) > 0 && <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.8 }}>{t.upper}–{t.lower}</span>}
            </button>
          );
        })}
      </div>

      {/* Match participants */}
      {(() => {
        const u0 = players.find(p => p.id === match.upper[0]);
        const u1 = players.find(p => p.id === match.upper[1]);
        const l0 = players.find(p => p.id === match.lower[0]);
        const l1 = players.find(p => p.id === match.lower[1]);
        if (!u0?.name || !l0?.name) return (
          <div style={{ padding: 20, textAlign: "center", color: "#666", fontSize: 13 }}>Assign players to this match in the Matches tab first.</div>
        );
        return null;
      })()}

      {/* Match status bar */}
      <div style={{ background: "linear-gradient(135deg, #163322, #0d1f14)", borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: "1px solid #c8a84b33", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#c8a84b", letterSpacing: 3, textTransform: "uppercase" }}>{match.label}</div>
          <div style={{ fontSize: 16, fontWeight: "bold", marginTop: 2 }}>{matchStatus()}</div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEAM_LIGHT["Upper Wentz"], letterSpacing: 1 }}>▲ UPPER</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: TEAM_LIGHT["Upper Wentz"] }}>{totals.upper}</div>
          </div>
          <div style={{ color: "#555", fontSize: 18 }}>–</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: TEAM_LIGHT["Lower Wentz"], letterSpacing: 1 }}>LOWER ▼</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: TEAM_LIGHT["Lower Wentz"] }}>{totals.lower}</div>
          </div>
        </div>
      </div>

      {/* Hole selector */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {HOLES.map(h => {
          const r = holeMatchPoints(match, h.hole, players, scores);
          let borderColor = "#444";
          let bg = "rgba(255,255,255,0.04)";
          let textColor = "#aaa";
          if (r) {
            if (r.upper > r.lower)      { borderColor = TEAM_COLORS["Upper Wentz"]; bg = TEAM_COLORS["Upper Wentz"] + "44"; textColor = TEAM_LIGHT["Upper Wentz"]; }
            else if (r.lower > r.upper) { borderColor = TEAM_COLORS["Lower Wentz"]; bg = TEAM_COLORS["Lower Wentz"] + "44"; textColor = TEAM_LIGHT["Lower Wentz"]; }
            else                         { borderColor = "#c8a84b"; bg = "#c8a84b22"; textColor = "#c8a84b"; }
          }
          const active = h.hole === currentHole;
          return (
            <button key={h.hole} onClick={() => setCurrentHole(h.hole)} style={{
              width: 34, height: 34, borderRadius: 6,
              border: `2px solid ${active ? "#c8a84b" : borderColor}`,
              background: active ? "#c8a84b" : bg,
              color: active ? "#0d1f14" : textColor,
              fontWeight: "bold", fontSize: 12, cursor: "pointer",
            }}>{h.hole}</button>
          );
        })}
      </div>

      {/* Current hole */}
      <div style={{ background: "#163322", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: "#c8a84b", letterSpacing: 3, textTransform: "uppercase" }}>Hole {hole.hole}{hole.par === 3 ? " · 📍 CTP" : ""}</div>
          <div style={{ fontSize: 26, fontWeight: "bold" }}>Par {hole.par} · HCP {hole.hcp}</div>
          <div style={{ fontSize: 12, color: "#777" }}>{hole.yards} yards</div>
        </div>
        {holeResult && (
          <div style={{ textAlign: "center", padding: "10px 16px", borderRadius: 10,
            background: holeResult.upper > holeResult.lower ? TEAM_COLORS["Upper Wentz"]+"44" : holeResult.lower > holeResult.upper ? TEAM_COLORS["Lower Wentz"]+"44" : "#c8a84b22",
            border: `1px solid ${holeResult.upper > holeResult.lower ? TEAM_COLORS["Upper Wentz"] : holeResult.lower > holeResult.upper ? TEAM_COLORS["Lower Wentz"] : "#c8a84b"}`,
          }}>
            <div style={{ fontSize: 10, color: "#aaa", letterSpacing: 1 }}>HOLE RESULT</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: holeResult.upper > holeResult.lower ? TEAM_LIGHT["Upper Wentz"] : holeResult.lower > holeResult.upper ? TEAM_LIGHT["Lower Wentz"] : "#c8a84b", marginTop: 2 }}>
              {holeResult.upper > holeResult.lower ? "▲ Upper" : holeResult.lower > holeResult.upper ? "Lower ▼" : "½ Halved"}
            </div>
            <div style={{ fontSize: 11, color: "#aaa" }}>{holeResult.upper} – {holeResult.lower} pts</div>
          </div>
        )}
      </div>

      {/* Score entry – 2 pairs side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[["upper", "Upper Wentz"], ["lower", "Lower Wentz"]].map(([side, team]) => {
          const pairIds = match[side].filter(Boolean);
          const bestNet = pairBestNetDisplay(pairIds, currentHole, players, scores, hole);
          return (
            <div key={side}>
              <div style={{ fontSize: 10, color: TEAM_LIGHT[team], letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>{team === "Upper Wentz" ? "▲" : "▼"} {team}</div>
              {pairIds.length === 0 && <div style={{ fontSize: 12, color: "#555" }}>No players assigned</div>}
              {pairIds.map(pid => {
                const p  = players.find(pl => pl.id === pid);
                if (!p) return null;
                const hcp = parseInt(p.handicap) || 0;
                const raw = scores[pid]?.[currentHole];
                const net = playerNet(pid);
                const strokes = strokesGiven(pid);
                const diff = net !== null ? net - hole.par : null;
                return (
                  <div key={pid} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px", marginBottom: 8, border: `1px solid ${TEAM_COLORS[team]}33` }}>
                    <div style={{ fontWeight: "bold", fontSize: 14, marginBottom: 2 }}>{p.name || "—"}</div>
                    <div style={{ fontSize: 10, color: "#777", marginBottom: 8 }}>HCP {hcp}{strokes > 0 ? ` · +${strokes} stroke${strokes > 1 ? "s" : ""}` : " · no stroke"}</div>
                    {/* Quick buttons */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {[hole.par - 1, hole.par, hole.par + 1, hole.par + 2, hole.par + 3].map(s => (
                        <button key={s} onClick={() => setScore(pid, currentHole, raw === s ? "" : s)} style={{
                          width: 30, height: 30, borderRadius: 6,
                          border: `2px solid ${raw === s ? TEAM_COLORS[team] : "#444"}`,
                          background: raw === s ? TEAM_COLORS[team] : "transparent",
                          color: raw === s ? "#fff" : "#aaa", fontWeight: "bold", fontSize: 12, cursor: "pointer",
                        }}>{s}</button>
                      ))}
                      <input type="number" min="1" max="15" value={raw || ""} placeholder="—"
                        onChange={e => setScore(pid, currentHole, e.target.value)}
                        style={{ width: 34, textAlign: "center", background: "rgba(255,255,255,0.08)", border: "1px solid #444", borderRadius: 6, color: "#c8a84b", fontSize: 13, fontWeight: "bold", padding: "4px 0", outline: "none", fontFamily: "Georgia,serif" }} />
                    </div>
                    {net !== null && (
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        <span style={{ color: "#777" }}>Net: </span>
                        <span style={{ fontWeight: "bold", color: diff < 0 ? "#58d68d" : diff === 0 ? "#c8a84b" : "#f1948a" }}>{net} ({diff === 0 ? "E" : diff > 0 ? `+${diff}` : diff})</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Best ball for this pair */}
              {bestNet !== null && (
                <div style={{ textAlign: "center", padding: "6px", background: "#c8a84b22", borderRadius: 6, fontSize: 12, color: "#c8a84b" }}>
                  Best ball net: <strong>{bestNet}</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hole hole-by-hole running totals mini table */}
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#163322" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", color: "#c8a84b" }}>Hole</th>
              {HOLES.map(h => <th key={h.hole} style={{ padding: "6px 4px", textAlign: "center", color: h.hole === currentHole ? "#c8a84b" : "#777", minWidth: 22 }}>{h.hole}</th>)}
              <th style={{ padding: "6px 8px", textAlign: "center", color: "#c8a84b" }}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {[["upper","Upper Wentz"], ["lower","Lower Wentz"]].map(([side, team]) => {
              let cumPts = 0;
              return (
                <tr key={side} style={{ borderBottom: "1px solid #ffffff08" }}>
                  <td style={{ padding: "6px 8px", color: TEAM_LIGHT[team], fontSize: 10, fontWeight: "bold" }}>{team === "Upper Wentz" ? "▲ UP" : "LO ▼"}</td>
                  {HOLES.map(h => {
                    const r = holeMatchPoints(match, h.hole, players, scores);
                    const pts = r ? (side === "upper" ? r.upper : r.lower) : null;
                    if (pts !== null) cumPts += pts;
                    return (
                      <td key={h.hole} style={{ padding: "6px 4px", textAlign: "center",
                        color: pts === null ? "#333" : pts === 1 ? "#58d68d" : pts === 0.5 ? "#c8a84b" : "#f1948a",
                        fontWeight: pts ? "bold" : "normal",
                        background: h.hole === currentHole ? "rgba(200,168,75,0.1)" : "transparent",
                      }}>
                        {pts === null ? "·" : pts === 0.5 ? "½" : pts}
                      </td>
                    );
                  })}
                  <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: "bold", color: TEAM_LIGHT[team], fontSize: 13 }}>{cumPts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Prev / Next */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => setCurrentHole(h => Math.max(1, h - 1))} disabled={currentHole === 1}
          style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: currentHole === 1 ? "#555" : "#f0ede6", cursor: currentHole === 1 ? "default" : "pointer", fontSize: 14 }}>← Prev</button>
        <button onClick={() => setCurrentHole(h => Math.min(18, h + 1))} disabled={currentHole === 18}
          style={{ padding: "10px 28px", borderRadius: 8, border: "1px solid #c8a84b", background: currentHole === 18 ? "transparent" : "#c8a84b", color: currentHole === 18 ? "#555" : "#0d1f14", cursor: currentHole === 18 ? "default" : "pointer", fontSize: 14, fontWeight: "bold" }}>Next →</button>
      </div>
    </div>
  );
}

function pairBestNetDisplay(pairIds, holeNum, players, scores, hole) {
  const nets = pairIds.map(pid => {
    const p = players.find(pl => pl.id === pid);
    if (!p) return null;
    const raw = scores[pid]?.[holeNum];
    if (raw === undefined) return null;
    return netScore(raw, parseInt(p.handicap) || 0, hole.hcp);
  }).filter(n => n !== null);
  return nets.length ? Math.min(...nets) : null;
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
function LeaderboardView({ matches, players, scores, matchTotals, cupTotals, holeMatchPoints }) {
  const cup = cupTotals();

  return (
    <div>
      {/* Cup totals */}
      <div style={{ background: "linear-gradient(135deg, #1e2d00, #163322)", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid #c8a84b55", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#c8a84b", letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>Wentz Cup · Total Points</div>
        <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: TEAM_LIGHT["Upper Wentz"], letterSpacing: 2 }}>▲ UPPER WENTZ</div>
            <div style={{ fontSize: 52, fontWeight: "bold", color: TEAM_LIGHT["Upper Wentz"], lineHeight: 1 }}>{cup.upper}</div>
          </div>
          <div style={{ fontSize: 28, color: "#555" }}>–</div>
          <div>
            <div style={{ fontSize: 10, color: TEAM_LIGHT["Lower Wentz"], letterSpacing: 2 }}>LOWER WENTZ ▼</div>
            <div style={{ fontSize: 52, fontWeight: "bold", color: TEAM_LIGHT["Lower Wentz"], lineHeight: 1 }}>{cup.lower}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#777", marginTop: 8 }}>of {cup.total} points played</div>
        {cup.upper !== cup.lower && cup.total > 0 && (
          <div style={{ marginTop: 12, display: "inline-block", padding: "6px 18px", borderRadius: 8,
            background: cup.upper > cup.lower ? TEAM_COLORS["Upper Wentz"]+"44" : TEAM_COLORS["Lower Wentz"]+"44",
            border: `1px solid ${cup.upper > cup.lower ? TEAM_COLORS["Upper Wentz"] : TEAM_COLORS["Lower Wentz"]}`,
            color: cup.upper > cup.lower ? TEAM_LIGHT["Upper Wentz"] : TEAM_LIGHT["Lower Wentz"], fontWeight: "bold", fontSize: 14 }}>
            {cup.upper > cup.lower ? "▲ Upper Wentz" : "Lower Wentz ▼"} leads by {Math.abs(cup.upper - cup.lower)} pts
          </div>
        )}
      </div>

      {/* Match-by-match breakdown */}
      <SectionHeader title="Match Scores" subtitle="Points per hole · 1 win · ½ tie" />
      <div style={{ display: "grid", gap: 12 }}>
        {matches.map(m => {
          const t = matchTotals(m, players, scores);
          const u0 = players.find(p => p.id === m.upper[0]);
          const u1 = players.find(p => p.id === m.upper[1]);
          const l0 = players.find(p => p.id === m.lower[0]);
          const l1 = players.find(p => p.id === m.lower[1]);
          const holesPlayed = HOLES.filter(h => holeMatchPoints(m, h.hole, players, scores) !== null).length;

          return (
            <div key={m.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: "bold", color: "#c8a84b", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    <span style={{ color: TEAM_LIGHT["Upper Wentz"] }}>{u0?.name || "?"} & {u1?.name || "?"}</span>
                    <span style={{ color: "#555", margin: "0 6px" }}>vs</span>
                    <span style={{ color: TEAM_LIGHT["Lower Wentz"] }}>{l0?.name || "?"} & {l1?.name || "?"}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{holesPlayed} / 18 holes played</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: TEAM_LIGHT["Upper Wentz"] }}>▲</div>
                    <div style={{ fontSize: 24, fontWeight: "bold", color: t.upper > t.lower ? TEAM_LIGHT["Upper Wentz"] : "#aaa" }}>{t.upper}</div>
                  </div>
                  <div style={{ color: "#555" }}>–</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: TEAM_LIGHT["Lower Wentz"] }}>▼</div>
                    <div style={{ fontSize: 24, fontWeight: "bold", color: t.lower > t.upper ? TEAM_LIGHT["Lower Wentz"] : "#aaa" }}>{t.lower}</div>
                  </div>
                </div>
              </div>

              {/* Mini hole-by-hole dots */}
              <div style={{ display: "flex", gap: 3, marginTop: 10, flexWrap: "wrap" }}>
                {HOLES.map(h => {
                  const r = holeMatchPoints(m, h.hole, players, scores);
                  let color = "#333";
                  if (r) color = r.upper > r.lower ? TEAM_COLORS["Upper Wentz"] : r.lower > r.upper ? TEAM_COLORS["Lower Wentz"] : "#c8a84b";
                  return (
                    <div key={h.hole} title={`H${h.hole}`} style={{
                      width: 18, height: 18, borderRadius: 4, background: color,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: r ? "#fff" : "#555",
                    }}>{r ? (r.upper > r.lower ? "U" : r.lower > r.upper ? "L" : "½") : h.hole}</div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BONUSES ──────────────────────────────────────────────────────────────────
function BonusView({ scat, setScat, scatWinners, setScatWinners, ctpWinners, setCtpWinners, players }) {
  const named = players.filter(p => p.name);
  return (
    <div>
      <SectionHeader title="Scat Pool" subtitle="Side bet · bonus pot per hole" />
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 16, border: "1px solid #c8a84b33", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Toggle on={scat.enabled} onToggle={() => setScat(s => ({ ...s, enabled: !s.enabled }))} />
          <span style={{ fontWeight: "bold" }}>Scat Enabled</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#777" }}>$/hole:</span>
            <input type="number" min="1" value={scat.amount} onChange={e => setScat(s => ({ ...s, amount: parseInt(e.target.value) || 0 }))}
              style={{ width: 50, textAlign: "center", background: "rgba(255,255,255,0.08)", border: "1px solid #444", borderRadius: 6, color: "#c8a84b", fontSize: 15, fontWeight: "bold", padding: "4px 0", outline: "none", fontFamily: "Georgia,serif" }} />
          </div>
        </div>
        {scat.enabled && <>
          <div style={{ fontSize: 10, color: "#c8a84b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Winning Team Per Hole</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 6 }}>
            {HOLES.map(h => (
              <div key={h.hole} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ fontSize: 11, color: "#777", width: 54, flexShrink: 0 }}>H{h.hole} (p{h.par})</span>
                {["Upper Wentz","Lower Wentz"].map(team => (
                  <button key={team} onClick={() => setScatWinners(s => ({ ...s, [h.hole]: s[h.hole] === team ? undefined : team }))}
                    style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: `1px solid ${TEAM_COLORS[team]}`, background: scatWinners[h.hole] === team ? TEAM_COLORS[team] : "transparent", color: scatWinners[h.hole] === team ? "#fff" : "#666", fontSize: 10, fontWeight: "bold", cursor: "pointer" }}>
                    {team === "Upper Wentz" ? "▲ UP" : "LO ▼"}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {["Upper Wentz","Lower Wentz"].map(team => {
              const won = Object.values(scatWinners).filter(v => v === team).length;
              return (
                <div key={team} style={{ padding: "10px 14px", background: TEAM_COLORS[team]+"22", borderRadius: 8, border: `1px solid ${TEAM_COLORS[team]}44` }}>
                  <div style={{ fontSize: 11, color: TEAM_LIGHT[team] }}>{team === "Upper Wentz" ? "▲" : "▼"} {team}</div>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: TEAM_LIGHT[team] }}>{won} <span style={{ fontSize: 12, color: "#aaa" }}>holes</span></div>
                  <div style={{ fontSize: 14, color: "#58d68d", fontWeight: "bold" }}>${won * scat.amount}</div>
                </div>
              );
            })}
          </div>
        </>}
      </div>

      <SectionHeader title="Closest to the Pin" subtitle={`Par 3 holes: ${CTP_HOLES.join(", ")}`} />
      <div style={{ display: "grid", gap: 10 }}>
        {CTP_HOLES.map(h => (
          <div key={h} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 14, border: "1px solid #58d68d33" }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#58d68d", marginBottom: 10 }}>📍 Hole {h} · Par 3 · {HOLES[h-1].yards} yds</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setCtpWinners(c => ({ ...c, [h]: undefined }))}
                style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${!ctpWinners[h] ? "#c8a84b" : "#444"}`, background: !ctpWinners[h] ? "#c8a84b22" : "transparent", color: !ctpWinners[h] ? "#c8a84b" : "#666", fontSize: 11, cursor: "pointer" }}>None</button>
              {named.map(p => (
                <button key={p.id} onClick={() => setCtpWinners(c => ({ ...c, [h]: p.id }))}
                  style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${ctpWinners[h] === p.id ? TEAM_COLORS[p.team] : "#444"}`, background: ctpWinners[h] === p.id ? TEAM_COLORS[p.team]+"44" : "transparent", color: ctpWinners[h] === p.id ? TEAM_LIGHT[p.team] : "#777", fontSize: 12, cursor: "pointer" }}>
                  {p.name}
                </button>
              ))}
            </div>
            {ctpWinners[h] && <div style={{ marginTop: 8, fontSize: 12, color: "#58d68d" }}>🏆 {named.find(p => p.id === ctpWinners[h])?.name}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
function SummaryView({ matches, players, scores, matchTotals, cupTotals, scat, scatWinners, ctpWinners }) {
  const cup = cupTotals();
  const named = players.filter(p => p.name);
  const winner = cup.upper > cup.lower ? "Upper Wentz" : cup.lower > cup.upper ? "Lower Wentz" : "Tie";

  const scatUpper = Object.values(scatWinners).filter(v => v === "Upper Wentz").length;
  const scatLower = Object.values(scatWinners).filter(v => v === "Lower Wentz").length;

  const ctpList = Object.entries(ctpWinners).filter(([,id]) => id)
    .map(([hole, id]) => ({ hole, player: named.find(p => p.id === id) })).filter(x => x.player);

  return (
    <div>
      {/* Champion */}
      <div style={{ background: "linear-gradient(135deg, #2d1a00, #163322)", borderRadius: 16, padding: 28, textAlign: "center", marginBottom: 24, border: "2px solid #c8a84b" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <div style={{ fontSize: 10, color: "#c8a84b", letterSpacing: 4, textTransform: "uppercase" }}>Wentz Cup Champion</div>
        <div style={{ fontSize: 30, fontWeight: "bold", marginTop: 8, color: winner === "Tie" ? "#c8a84b" : TEAM_LIGHT[winner] }}>
          {winner === "Tie" ? "All Square — Tie" : `${winner === "Upper Wentz" ? "▲" : "▼"} ${winner}`}
        </div>
        <div style={{ fontSize: 16, color: "#aaa", marginTop: 6 }}>{cup.upper} – {cup.lower} pts</div>
      </div>

      {/* Match results */}
      <SectionHeader title="Match Results" />
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {matches.map(m => {
          const t = matchTotals(m, players, scores);
          const u0 = players.find(p => p.id === m.upper[0]);
          const u1 = players.find(p => p.id === m.upper[1]);
          const l0 = players.find(p => p.id === m.lower[0]);
          const l1 = players.find(p => p.id === m.lower[1]);
          const mWinner = t.upper > t.lower ? "upper" : t.lower > t.upper ? "lower" : null;
          return (
            <div key={m.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 16px", border: `1px solid ${mWinner === "upper" ? TEAM_COLORS["Upper Wentz"]+"55" : mWinner === "lower" ? TEAM_COLORS["Lower Wentz"]+"55" : "#333"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#c8a84b", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    <span style={{ color: mWinner === "upper" ? TEAM_LIGHT["Upper Wentz"] : "#aaa" }}>{u0?.name || "?"} & {u1?.name || "?"}</span>
                    <span style={{ color: "#555", margin: "0 6px" }}>vs</span>
                    <span style={{ color: mWinner === "lower" ? TEAM_LIGHT["Lower Wentz"] : "#aaa" }}>{l0?.name || "?"} & {l1?.name || "?"}</span>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: "bold" }}>
                  <span style={{ color: mWinner === "upper" ? TEAM_LIGHT["Upper Wentz"] : "#aaa" }}>{t.upper}</span>
                  <span style={{ color: "#555", margin: "0 6px" }}>–</span>
                  <span style={{ color: mWinner === "lower" ? TEAM_LIGHT["Lower Wentz"] : "#aaa" }}>{t.lower}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scat */}
      {scat.enabled && (
        <>
          <SectionHeader title="Scat Pool" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[["Upper Wentz", scatUpper], ["Lower Wentz", scatLower]].map(([team, won]) => (
              <div key={team} style={{ padding: "14px", background: TEAM_COLORS[team]+"22", borderRadius: 10, textAlign: "center", border: `1px solid ${TEAM_COLORS[team]}44` }}>
                <div style={{ fontSize: 11, color: TEAM_LIGHT[team] }}>{team === "Upper Wentz" ? "▲" : "▼"} {team}</div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: TEAM_LIGHT[team] }}>{won} holes</div>
                <div style={{ fontSize: 18, color: "#58d68d", fontWeight: "bold" }}>${won * scat.amount}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CTP */}
      {ctpList.length > 0 && (
        <>
          <SectionHeader title="Closest to the Pin" />
          <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, border: "1px solid #58d68d33" }}>
            {ctpList.map(({ hole, player }) => (
              <div key={hole} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #ffffff08" }}>
                <span style={{ color: "#aaa", fontSize: 13 }}>📍 Hole {hole}</span>
                <span style={{ fontWeight: "bold", color: TEAM_LIGHT[player.team], fontSize: 13 }}>{player.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SHARED ───────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: 1 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{subtitle}</div>}
      <div style={{ height: 1, background: "linear-gradient(90deg, #c8a84b, transparent)", marginTop: 8 }} />
    </div>
  );
}

function TeamLabel({ team }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <div style={{ width: 4, height: 24, background: TEAM_COLORS[team], borderRadius: 2 }} />
      <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 2, color: TEAM_LIGHT[team], textTransform: "uppercase" }}>
        {team === "Upper Wentz" ? "▲" : "▼"} {team}
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: on ? "#c8a84b" : "#333", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 23 : 3, transition: "left 0.2s" }} />
    </button>
  );
}
