import { useMemo, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "4s for Whores — Everyone drinks (stacks with mates)",
  5: "Guys drink (stacks with mates)",
  6: "6s for Dicks — Everyone drinks (stacks with mates)",
  7: "Heaven (holder can trigger)",
  8: "Pick a Mate",
  9: "Rhyme (drawer enforces)",
  10: "Categories (drawer enforces)",
  J: "Thumbmaster (holder can trigger)",
  Q: "Question Master (penalty on answered question)",
  K: "Make a Rule (persists)",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  RANKS.forEach(r => SUITS.forEach(s => deck.push(`${r}${s}`)));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const rankOf = (c) => c.replace(/[^A-Z0-9]/g, "");

/* =========================
   APP
========================= */

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);
  const [questionHolder, setQuestionHolder] = useState(null);

  const [qPenaltyMode, setQPenaltyMode] = useState(false);

  const [race, setRace] = useState({ type: null, holder: null, reacted: new Set() });

  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [waterfallIndex, setWaterfallIndex] = useState(null);

  const [round, setRound] = useState({ type: null, owner: null, index: null });

  const [houseRules, setHouseRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const [drinkFlash, setDrinkFlash] = useState([]);
  const [lastLoser, setLastLoser] = useState(null);
  const [drawAnimTick, setDrawAnimTick] = useState(0);

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  /* =========================
     DRINK LOGIC
  ========================= */

  function drink(p) {
    setBeers(b => ({ ...b, [p]: b[p] + 1 }));
    setDrinkFlash(f => [...new Set([...f, p])]);
    setTimeout(() => {
      setDrinkFlash(f => f.filter(x => x !== p));
    }, 2200);
  }

  function propagateDrink(p, seen = new Set()) {
    if (seen.has(p)) return;
    seen.add(p);
    drink(p);
    mates[p].forEach(m => propagateDrink(m, seen));
  }

  function drinkAll() {
    PLAYERS.forEach(p => propagateDrink(p));
  }

  /* =========================
     RACES
  ========================= */

  function startRace(type, holder) {
    if (!holder || phase.type !== "IDLE") return;
    setRace({ type, holder, reacted: new Set() });
    setLastLoser(null);
    setPhase({ type: `RACE_${type}`, owner: holder });
  }

  function handleRaceTap(p) {
    if (!race.type || p === race.holder || race.reacted.has(p)) return;

    const next = new Set(race.reacted);
    next.add(p);

    if (next.size === PLAYERS.length - 2) {
      const loser = PLAYERS.find(x => x !== race.holder && !next.has(x));
      setLastLoser(loser);
      propagateDrink(loser);
      setRace({ type: null, holder: null, reacted: new Set() });
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    setRace(r => ({ ...r, reacted: next }));
  }

  /* =========================
     DRAW
  ========================= */

  const drawLocked =
    phase.type !== "IDLE" ||
    qPenaltyMode ||
    deck.length === 0;

  function drawCard() {
    if (drawLocked) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);
    setDrawAnimTick(t => t + 1);

    const r = rankOf(next);
    const drawer = currentPlayer;

    if (r === "A") return setPhase({ type: "WATERFALL_READY", owner: drawer });
    if (r === "8") return setPhase({ type: "SELECT_MATE", owner: drawer });
    if (r === "2") return setPhase({ type: "SELECT_DRINK", owner: drawer });
    if (r === "9") return setRound({ type: "RHYME", owner: drawer, index: (turn + 1) % 6 }) || setPhase({ type: "RHYME_ACTIVE", owner: drawer });
    if (r === "10") return setRound({ type: "CATEGORIES", owner: drawer, index: (turn + 1) % 6 }) || setPhase({ type: "CATEGORIES_ACTIVE", owner: drawer });
    if (r === "K") return setPhase({ type: "MAKE_RULE", owner: drawer });

    if (r === "J") setThumbHolder(drawer);
    if (r === "7") setHeavenHolder(drawer);
    if (r === "Q") setQuestionHolder(drawer);

    if (r === "3") propagateDrink(drawer);
    if (["4","6"].includes(r)) drinkAll();
    if (r === "5") PLAYERS.forEach(p => propagateDrink(p));

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* =========================
     TAP PLAYER
  ========================= */

  function tapPlayer(p) {
    if (qPenaltyMode) {
      propagateDrink(p);
      setQPenaltyMode(false);
      return;
    }

    if (phase.type.startsWith("RACE")) return handleRaceTap(p);

    if (phase.type === "SELECT_MATE" && p !== phase.owner) {
      setMates(m => ({
        ...m,
        [phase.owner]: [...new Set([...m[phase.owner], p])]
      }));
      setPhase({ type: "IDLE", owner: null });
      setTurn(t => (t + 1) % 6);
      return;
    }

    if (phase.type === "SELECT_DRINK") {
      propagateDrink(p);
      setPhase({ type: "IDLE", owner: null });
      setTurn(t => (t + 1) % 6);
      return;
    }
  }

  /* =========================
     STATUS
  ========================= */

  const statusText = useMemo(() => {
    if (qPenaltyMode) return "Q Penalty: tap a player";
    if (phase.type === "SELECT_MATE") return "Pick a Mate";
    if (phase.type === "SELECT_DRINK") return "Pick someone to drink";
    if (phase.type.startsWith("RACE")) return `${race.type} race active`;
    if (phase.type === "MAKE_RULE") return "Make a rule (persists)";
    return CARD_RULES[currentRank] || "Draw a card";
  }, [phase, currentRank, qPenaltyMode, race.type]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>
      <div className="status">{statusText}</div>

      <div className="control-bar">
        <div className="power-col">
          <button disabled={!heavenHolder} onClick={() => startRace("HEAVEN", heavenHolder)}>
            ☁️ Heaven<br />{heavenHolder || "—"}
          </button>
          <button disabled={!thumbHolder} onClick={() => startRace("THUMB", thumbHolder)}>
            👍 Thumb<br />{thumbHolder || "—"}
          </button>
          <button disabled={!questionHolder} onClick={() => setQPenaltyMode(v => !v)}>
            ❓ Q Penalty<br />{questionHolder || "—"}
          </button>
        </div>

        <div key={drawAnimTick} className={`card ${drawLocked ? "locked" : ""}`} onClick={drawCard}>
          {card ? (
            <>
              <div className="rank">{card}</div>
              <div className="rule">{CARD_RULES[currentRank]}</div>
            </>
          ) : "DRAW"}
        </div>
      </div>

      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player ${p === currentPlayer ? "turn" : ""} ${drinkFlash.includes(p) ? "drink" : ""}`}
            onClick={() => tapPlayer(p)}
          >
            <div className="name">{p}</div>
            <div className="beer">🍺 {beers[p]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
