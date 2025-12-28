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
  Q: "Question Master (1 drink penalty)",
  K: "Make a Rule (persists)",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  RANKS.forEach(r => SUITS.forEach(s => deck.push(`${r}${s}`)));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const rankOf = c => c.replace(/[^A-Z0-9]/g, "");

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
  const [drinkFlash, setDrinkFlash] = useState([]);

  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);
  const [questionHolder, setQuestionHolder] = useState(null);
  const [qPenaltyMode, setQPenaltyMode] = useState(false);

  const [houseRules, setHouseRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => [...f, name]);
    setTimeout(() => {
      setDrinkFlash(f => f.filter(x => x !== name));
    }, 900);
  }

  function propagateDrink(name, seen = new Set()) {
    if (seen.has(name)) return;
    seen.add(name);
    drink(name);
    mates[name].forEach(m => propagateDrink(m, seen));
  }

  function drinkAll() {
    PLAYERS.forEach(p => propagateDrink(p));
  }

  function drawCard() {
    if (phase.type !== "IDLE" || qPenaltyMode || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    if (r === "8") return setPhase({ type: "SELECT_MATE", owner: drawer });
    if (r === "2") return setPhase({ type: "SELECT_DRINK", owner: drawer });

    if (r === "3") propagateDrink(drawer);
    if (["4", "5", "6"].includes(r)) drinkAll();

    if (r === "7") setHeavenHolder(drawer);
    if (r === "J") setThumbHolder(drawer);
    if (r === "Q") setQuestionHolder(drawer);
    if (r === "K") return setPhase({ type: "MAKE_RULE", owner: drawer });

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  function tapPlayer(name) {
    if (qPenaltyMode) {
      propagateDrink(name);
      setQPenaltyMode(false);
      return;
    }

    if (phase.type === "SELECT_MATE" && name !== phase.owner) {
      setMates(m => ({
        ...m,
        [phase.owner]: [...new Set([...m[phase.owner], name])]
      }));
      setPhase({ type: "IDLE", owner: null });
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      setTurn(t => (t + 1) % PLAYERS.length);
    }
  }

  function saveRule() {
    if (!ruleDraft.trim()) return;
    setHouseRules(r => [...r, { id: Date.now(), text: ruleDraft.trim() }]);
    setRuleDraft("");
    setPhase({ type: "IDLE", owner: null });
    setTurn(t => (t + 1) % PLAYERS.length);
  }

  const matePills = useMemo(
    () =>
      Object.entries(mates).flatMap(([a, list]) =>
        list.map(b => `${a} → ${b}`)
      ),
    [mates]
  );

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>
      <div className="status">
        {phase.type === "MAKE_RULE"
          ? `Make a Rule: ${phase.owner} types it (persists)`
          : CARD_RULES[currentRank] || "Draw a card"}
      </div>

      {/* RIGHT EDGE CONTEXT */}
      <div className="edge-rail">
        <div className="rail-section">
          <div className="rail-title">🤝 Mates</div>
          <div className="rail-scroll">
            {matePills.length === 0
              ? <span className="pill muted">No mates</span>
              : matePills.map((m,i)=>(
                  <span key={i} className="pill mate">{m}</span>
                ))
            }
          </div>
        </div>

        <div className="rail-section">
          <div className="rail-title">📜 Rules</div>
          <div className="rail-scroll">
            {houseRules.length === 0
              ? <span className="pill muted">No rules</span>
              : houseRules.map(r=>(
                  <span key={r.id} className="pill small">📌 {r.text}</span>
                ))
            }
          </div>
        </div>
      </div>

      {/* CONTROL */}
      <div className="control-bar">
        <div className="power-col">
          <div className="power">☁️ HEAVEN {heavenHolder || "—"}</div>
          <div className="power">👍 THUMB {thumbHolder || "—"}</div>
          <div
            className={`power ${qPenaltyMode ? "armed" : ""}`}
            onClick={() => setQPenaltyMode(v => !v)}
          >
            ❓ Q {questionHolder || "—"}
          </div>
        </div>

        <div className="card" onClick={drawCard}>
          {card ? (
            <>
              <div className="rank">{card}</div>
              <div className="rule">{CARD_RULES[currentRank]}</div>
            </>
          ) : (
            "DRAW"
          )}
        </div>
      </div>

      {phase.type === "MAKE_RULE" && (
        <div className="rulebar">
          <input
            value={ruleDraft}
            onChange={e => setRuleDraft(e.target.value)}
            placeholder="Type the rule (persists)..."
          />
          <button onClick={saveRule}>Add</button>
        </div>
      )}

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player ${p===currentPlayer?"turn":""} ${drinkFlash.includes(p)?"drink":""}`}
            onClick={() => tapPlayer(p)}
          >
            <div className="name">{p}</div>
            <div className="beer">🍺 {beers[p]}</div>
          </div>
        ))}
      </div>

      <button className="reset" onClick={() => window.location.reload()}>
        Reset Game
      </button>
    </div>
  );
}
