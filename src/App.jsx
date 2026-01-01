import { useEffect, useMemo, useState } from "react";
import "./styles.css";

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const DRINK_FLASH_MS = 2000;

function buildDeck() {
  const d = [];
  RANKS.forEach(r => SUITS.forEach(s => d.push(`${r}${s}`)));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
const rankOf = c => c.replace(/[^A-Z0-9]/g, "");

export default function App() {
  /* ---------- GAME CORE ---------- */
  const [phase, setPhase] = useState("WAITING"); 
  // WAITING | IDLE | SELECT_MATE | WATERFALL_READY | WATERFALL_ACTIVE | RHYME_ACTIVE | CATEGORIES_ACTIVE | MAKE_RULE | RACE_HEAVEN | RACE_THUMB
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  /* ---------- PLAYERS ---------- */
  const [players, setPlayers] = useState(
    PLAYER_NAMES.map(name => ({
      name,
      beers: 0,
      gender: "M", // M | F (editable pre-start)
      status: []   // TURN | THUMB | HEAVEN | Q
    }))
  );

  const currentPlayer = players[turn]?.name ?? null;

  /* ---------- HOLDERS ---------- */
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);
  const [questionHolder, setQuestionHolder] = useState(null);

  /* ---------- EFFECTS ---------- */
  const [drinkFlash, setDrinkFlash] = useState(new Set());
  const [lastLoser, setLastLoser] = useState(null);

  /* ---------- MATES ---------- */
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYER_NAMES.map(p => [p, []]))
  );

  /* ---------- WATERFALL ---------- */
  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [waterfallIndex, setWaterfallIndex] = useState(null);

  /* ---------- 9 / 10 ROUNDS ---------- */
  const [round, setRound] = useState({
    type: null, // RHYME | CATEGORIES
    enforcer: null,
    index: null
  });

  /* ---------- K RULES ---------- */
  const [houseRules, setHouseRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  /* ---------- RACES ---------- */
  const [race, setRace] = useState({ type: null, holder: null, reacted: new Set() });

  /* =========================
     HELPERS
  ========================= */
  function flashDrink(name) {
    setDrinkFlash(prev => new Set(prev).add(name));
    setTimeout(() => {
      setDrinkFlash(prev => {
        const n = new Set(prev);
        n.delete(name);
        return n;
      });
    }, DRINK_FLASH_MS);
  }

  function drink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    setPlayers(ps => ps.map(p => p.name === name ? { ...p, beers: p.beers + 1 } : p));
    flashDrink(name);
    mates[name]?.forEach(m => drink(m, visited));
  }

  function drinkAll(filterFn = null) {
    players.forEach(p => {
      if (!filterFn || filterFn(p)) drink(p.name);
    });
  }

  /* =========================
     GAME START
  ========================= */
  function startGame() {
    if (phase !== "WAITING") return;
    setPlayers(ps => ps.map((p,i) => ({
      ...p,
      status: i === 0 ? ["TURN"] : []
    })));
    setTurn(0);
    setPhase("IDLE");
  }

  /* =========================
     DRAW CARD
  ========================= */
  function drawCard() {
    if (phase !== "IDLE") return;
    if (deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    // --- A: Waterfall ---
    if (r === "A") {
      setWaterfallReady(new Set());
      setPhase("WATERFALL_READY");
      return;
    }

    // --- 4: WOMEN DRINK ---
    if (r === "4") {
      drinkAll(p => p.gender === "F");
      advanceTurn();
      return;
    }

    // --- 6: DICKS (ALL DRINK) ---
    if (r === "6") {
      drinkAll();
      advanceTurn();
      return;
    }

    // --- 7: HEAVEN HOLDER ---
    if (r === "7") {
      setHeavenHolder(drawer);
      advanceTurn();
      return;
    }

    // --- 8: PICK MATE ---
    if (r === "8") {
      setPhase("SELECT_MATE");
      return;
    }

    // --- 9: RHYME ---
    if (r === "9") {
      setRound({ type: "RHYME", enforcer: drawer, index: nextIndex(turn) });
      setPhase("RHYME_ACTIVE");
      return;
    }

    // --- 10: CATEGORIES ---
    if (r === "10") {
      setRound({ type: "CATEGORIES", enforcer: drawer, index: nextIndex(turn) });
      setPhase("CATEGORIES_ACTIVE");
      return;
    }

    // --- J: THUMB HOLDER ---
    if (r === "J") {
      setThumbHolder(drawer);
      advanceTurn();
      return;
    }

    // --- Q: QUESTION MASTER ---
    if (r === "Q") {
      setQuestionHolder(drawer);
      advanceTurn();
      return;
    }

    // --- K: MAKE RULE ---
    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    // --- DEFAULT ---
    advanceTurn();
  }

  function advanceTurn() {
    setPlayers(ps => ps.map(p => ({ ...p, status: [] })));
    setTurn(t => {
      const nt = (t + 1) % players.length;
      setPlayers(ps => ps.map((p,i) => i === nt ? { ...p, status: ["TURN"] } : p));
      return nt;
    });
  }

  function nextIndex(i) {
    return (i + 1) % players.length;
  }

  /* =========================
     WATERFALL
  ========================= */
  function tapPlayer(name) {
    // WATERFALL READY
    if (phase === "WATERFALL_READY") {
      setWaterfallReady(r => new Set(r).add(name));
      return;
    }
    // WATERFALL ACTIVE
    if (phase === "WATERFALL_ACTIVE") {
      if (players[waterfallIndex]?.name !== name) return;
      setWaterfallIndex(i => nextIndex(i));
      return;
    }
    // SELECT MATE (one-way, no duplicates)
    if (phase === "SELECT_MATE" && name !== currentPlayer) {
      setMates(m => {
        if (m[currentPlayer].includes(name)) return m;
        return { ...m, [currentPlayer]: [...m[currentPlayer], name] };
      });
      advanceTurn();
      setPhase("IDLE");
      return;
    }
    // RACES
    if (phase === "RACE_HEAVEN" || phase === "RACE_THUMB") {
      handleRaceTap(name);
      return;
    }
  }

  function startWaterfall() {
    if (waterfallReady.size !== players.length) return;
    setWaterfallIndex(turn);
    setPhase("WATERFALL_ACTIVE");
  }

  function endWaterfall() {
    setWaterfallReady(new Set());
    setWaterfallIndex(null);
    setPhase("IDLE");
    advanceTurn();
  }

  /* =========================
     RACES (7 / J)
  ========================= */
  function startRace(type) {
    if (phase !== "IDLE") return;
    const holder = type === "HEAVEN" ? heavenHolder : thumbHolder;
    if (!holder) return;
    setRace({ type, holder, reacted: new Set() });
    setPhase(type === "HEAVEN" ? "RACE_HEAVEN" : "RACE_THUMB");
  }

  function handleRaceTap(name) {
    if (name === race.holder) return;
    if (race.reacted.has(name)) return;
    const next = new Set(race.reacted);
    next.add(name);
    if (next.size === players.length - 1) {
      const loser = players.find(p => p.name !== race.holder && !next.has(p.name))?.name;
      if (loser) {
        setLastLoser(loser);
        drink(loser);
      }
      setRace({ type: null, holder: null, reacted: new Set() });
      setPhase("IDLE");
      return;
    }
    setRace(r => ({ ...r, reacted: next }));
  }

  /* =========================
     9 / 10 ROUNDS
  ========================= */
  function roundNext() {
    setRound(r => ({ ...r, index: nextIndex(r.index) }));
  }
  function roundLose() {
    const loser = players[round.index]?.name;
    if (loser) {
      setLastLoser(loser);
      drink(loser);
    }
    setRound({ type: null, enforcer: null, index: null });
    setPhase("IDLE");
    advanceTurn();
  }

  /* =========================
     K RULES
  ========================= */
  function submitRule() {
    if (!ruleDraft.trim()) return;
    setHouseRules(rs => [...rs, ruleDraft.trim()]);
    setRuleDraft("");
    setPhase("IDLE");
    advanceTurn();
  }

  /* =========================
     STATUS BAR TEXT
  ========================= */
  const statusText = useMemo(() => {
    if (phase === "WAITING") return "Waiting for everyone to be ready";
    if (phase === "IDLE") return `${currentPlayer}’s turn — draw a card`;
    if (phase === "WATERFALL_READY") return "Waterfall — everyone tap READY";
    if (phase === "WATERFALL_ACTIVE") return `Waterfall — ${players[waterfallIndex]?.name} is drinking`;
    if (phase === "SELECT_MATE") return "Pick a mate (one-way)";
    if (phase === "RACE_HEAVEN") return "Heaven active — last to tap drinks";
    if (phase === "RACE_THUMB") return "Thumbmaster active — last to tap drinks";
    if (phase === "RHYME_ACTIVE") return "Rhyme — pick the loser";
    if (phase === "CATEGORIES_ACTIVE") return "Categories — pick the loser";
    if (phase === "MAKE_RULE") return "Make a rule — it persists";
    return "";
  }, [phase, currentPlayer, players, waterfallIndex]);

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
      </header>

      <div className="top-grid">
        <Panel title="🤝 Mates" />
        <div className="panel card-panel">
          {!card ? (
            <div className="card draw" onClick={drawCard}>DRAW</div>
          ) : (
            <div className="card active">
              <div className="rank">{card}</div>
              <div className="sub">{deck.length} left</div>
            </div>
          )}
        </div>
        <Panel title="📜 Rules" rows={houseRules} />
      </div>

      <div className="actions">
        <button className="btn thumb" onClick={() => startRace("THUMB")} disabled={phase !== "IDLE"}>👍 Thumb</button>
        <button className="btn ready" onClick={startGame} disabled={phase !== "WAITING"}>Ready</button>
        <button className="btn heaven" onClick={() => startRace("HEAVEN")} disabled={phase !== "IDLE"}>☁ Heaven</button>
      </div>

      <div className="status-bar">
        <span className="detail">{statusText}</span>
        {(phase === "RHYME_ACTIVE" || phase === "CATEGORIES_ACTIVE") && (
          <>
            <button className="pill" onClick={roundNext}>Next</button>
            <button className="pill danger" onClick={roundLose}>Lose</button>
          </>
        )}
        {phase === "WATERFALL_READY" && (
          <button className="pill" onClick={startWaterfall} disabled={waterfallReady.size !== players.length}>Start</button>
        )}
        {phase === "WATERFALL_ACTIVE" && (
          <button className="pill" onClick={endWaterfall}>End</button>
        )}
      </div>

      {phase === "MAKE_RULE" && (
        <div className="rulebar">
          <input value={ruleDraft} onChange={e => setRuleDraft(e.target.value)} placeholder="Type the rule…" />
          <button onClick={submitRule}>Save</button>
        </div>
      )}

      <div className="players">
        {players.map(p => (
          <div
            key={p.name}
            className={`player ${p.status.includes("TURN") ? "TURN" : ""} ${drinkFlash.has(p.name) ? "drink" : ""}`}
            onClick={() => tapPlayer(p.name)}
          >
            <div className="video" />
            <div className="overlay">
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, rows = [] }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {(rows.length ? rows.slice(-4) : Array.from({ length: 4 })).map((r, i) => (
        <div key={i} className="row">{r || "—"}</div>
      ))}
    </div>
  );
        }
