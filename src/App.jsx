import { useState } from "react";
import "./styles.css";

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const SUITS = ["♠","♥","♦","♣"];

// Reduced + locked rules
const RULE_TEXT = {
  "4": "4s for Whores — Everyone drinks",
  "6": "6s for Dicks — Everyone drinks",
  "7": "Heaven — Last to hit Heaven drinks",
  "J": "Thumbmaster — Last to hit Thumb drinks",
  "K": "Make a Rule — Create a house rule",
};

function buildDeck() {
  const deck = [];
  RANKS.forEach(r => SUITS.forEach(s => deck.push({ rank: r, suit: s })));
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [phase, setPhase] = useState("WAITING"); 
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map(name => ({
      name,
      beers: 0,
      status: null,
    }))
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusText, setStatusText] = useState("Waiting to start");
  const [houseRules, setHouseRules] = useState([]);
  const [ruleInput, setRuleInput] = useState("");

  /* =====================
     GAME FLOW
  ===================== */

  function startGame() {
    if (phase !== "WAITING") return;
    setPhase("PLAYING");
    setPlayers(p =>
      p.map((pl, i) => ({
        ...pl,
        status: i === 0 ? "TURN" : null,
      }))
    );
    setStatusText(`${players[0].name} starts`);
  }

  function drawCard() {
    if (phase !== "PLAYING") return;
    if (deck.length === 0) {
      setStatusText("Deck empty — Game Over");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const rule = RULE_TEXT[next.rank];
    setStatusText(
      rule
        ? `${players[currentIndex].name}: ${rule}`
        : `${players[currentIndex].name} drew ${next.rank}${next.suit}`
    );

    if (next.rank === "K") {
      setPhase("MAKE_RULE");
    }
  }

  function nextTurn() {
    const next = (currentIndex + 1) % players.length;
    setPlayers(p =>
      p.map((pl, i) => ({
        ...pl,
        status: i === next ? "TURN" : null,
      }))
    );
    setCurrentIndex(next);
    setCard(null);
    setPhase("PLAYING");
    setStatusText(`${players[next].name}'s turn`);
  }

  function giveDrink(index) {
    setPlayers(p =>
      p.map((pl, i) =>
        i === index ? { ...pl, beers: pl.beers + 1 } : pl
      )
    );
  }

  /* =====================
     KING → MAKE RULE
  ===================== */

  function submitRule() {
    if (!ruleInput.trim()) return;
    setHouseRules(r => [...r, ruleInput.trim()]);
    setRuleInput("");
    nextTurn();
  }

  /* =====================
     UI ACTIONS (STUBBED)
  ===================== */

  function triggerHeaven() {
    setStatusText("Heaven triggered — last to press drinks");
  }

  function triggerThumb() {
    setStatusText("Thumb triggered — last to press drinks");
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
      </header>

      {/* TOP GRID */}
      <section className="top-grid">
        <Panel title="🤝 Mates" />

        <div className="panel card-panel">
          {!card ? (
            <div className="card draw" onClick={drawCard}>
              DRAW
            </div>
          ) : (
            <div className="card active">
              <div className="rank">
                {card.rank}
                {card.suit}
              </div>
              <div className="sub">{deck.length} cards left</div>
            </div>
          )}
        </div>

        <Panel title="📜 Rules" items={houseRules} />
      </section>

      {/* ACTION BUTTONS */}
      <section className="actions">
        <button
          className="btn thumb"
          onClick={triggerThumb}
          disabled={phase !== "PLAYING"}
        >
          👍 Thumb
        </button>

        <button
          className="btn ready"
          onClick={startGame}
          disabled={phase !== "WAITING"}
        >
          Ready
        </button>

        <button
          className="btn heaven"
          onClick={triggerHeaven}
          disabled={phase !== "PLAYING"}
        >
          ☁ Heaven
        </button>
      </section>

      {/* STATUS BAR */}
      <section className="status-bar">
        <span className="status-text">{statusText}</span>
        {phase === "PLAYING" && (
          <button className="pill" onClick={nextTurn}>
            Next
          </button>
        )}
      </section>

      {/* KING RULE INPUT */}
      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleInput}
            onChange={e => setRuleInput(e.target.value)}
            placeholder="Type the new rule…"
          />
          <button onClick={submitRule}>Save Rule</button>
        </div>
      )}

      {/* PLAYERS */}
      <section className="players">
        {players.map((p, i) => (
          <div key={p.name} className={`player ${p.status || ""}`}>
            <div className="video-tile" />
            <div className="player-info">
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Panel({ title, items = [] }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {items.length === 0
        ? [...Array(4)].map((_, i) => (
            <div key={i} className="row muted">—</div>
          ))
        : items.map((r, i) => (
            <div key={i} className="row">{r}</div>
          ))}
    </div>
  );
}
