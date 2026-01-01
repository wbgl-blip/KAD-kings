import { useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULE_TEXT = {
  A: "Waterfall — drawer drinks first, clockwise",
  2: "Pick someone to drink",
  3: "Me — drawer drinks",
  4: "Women drink",
  5: "Guys drink",
  6: "Everyone drinks",
  7: "Heaven — last to tap drinks",
  8: "Pick a mate",
  9: "Rhyme — pick the loser",
  10: "Categories — pick the loser",
  J: "Thumbmaster — last to tap drinks",
  Q: "Question Master — answered question = drink",
  K: "Make a rule",
};

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  RANKS.forEach(r => SUITS.forEach(s => deck.push({ rank: r, suit: s })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* =========================
   APP
========================= */

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  const [turnIndex, setTurnIndex] = useState(0);
  const [phase, setPhase] = useState("WAITING");
  // WAITING | IDLE | PICK_DRINK | PICK_MATE | THUMB_RACE | HEAVEN_RACE | MAKE_RULE

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map(name => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");

  const [flashNames, setFlashNames] = useState(new Set());
  const flashTimer = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(
    () => players[turnIndex],
    [players, turnIndex]
  );

  /* =========================
     HELPERS
  ========================= */

  function nextTurn() {
    setTurnIndex(i => (i + 1) % playersRef.current.length);
  }

  function flash(names) {
    clearTimeout(flashTimer.current);
    setFlashNames(new Set(names));
    flashTimer.current = setTimeout(() => setFlashNames(new Set()), 2000);
  }

  function addDrink(name) {
    setPlayers(p =>
      p.map(pl =>
        pl.name === name ? { ...pl, beers: pl.beers + 1 } : pl
      )
    );
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    addDrink(name);
    const p = playersRef.current.find(x => x.name === name);
    (p?.mates || []).forEach(m => propagateDrink(m, visited));
  }

  /* =========================
     GAME FLOW
  ========================= */

  function startGame() {
    setPhase("IDLE");
    setStatusText(`${currentPlayer.name}'s turn — tap the deck`);
  }

  function drawCard() {
    if (phase !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    setStatusText(RULE_TEXT[r]);

    if (r === "2") return setPhase("PICK_DRINK");
    if (r === "8") return setPhase("PICK_MATE");
    if (r === "7") return setPhase("HEAVEN_RACE");
    if (r === "J") return setPhase("THUMB_RACE");
    if (r === "K") return setPhase("MAKE_RULE");

    if (r === "3") {
      flash([currentPlayer.name]);
      propagateDrink(currentPlayer.name);
      nextTurn();
      return;
    }

    if (r === "6") {
      const all = playersRef.current.map(p => p.name);
      flash(all);
      all.forEach(propagateDrink);
      nextTurn();
      return;
    }

    nextTurn();
  }

  /* =========================
     INTERACTIONS
  ========================= */

  function tapPlayer(name) {
    if (phase === "PICK_DRINK") {
      flash([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusText(`${name} drinks`);
      return;
    }

    if (phase === "PICK_MATE" && name !== currentPlayer.name) {
      setPlayers(p =>
        p.map(pl =>
          pl.name === currentPlayer.name && !pl.mates.includes(name)
            ? { ...pl, mates: [...pl.mates, name] }
            : pl
        )
      );
      setPhase("IDLE");
      nextTurn();
      setStatusText(`${currentPlayer.name} picked ${name} as a mate`);
      return;
    }

    if (phase === "THUMB_RACE" || phase === "HEAVEN_RACE") {
      flash([name]);
      propagateDrink(name);
      setPhase("IDLE");
      nextTurn();
      setStatusText(`${name} was last — drinks`);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
      </header>

      <section className="top-grid">
        <div className="panel" />

        <div className="panel card-panel">
          <div
            className="card draw"
            onClick={drawCard}
          >
            {!card ? (
              "DRAW"
            ) : (
              <>
                <div className="rank">
                  {card.rank}{card.suit}
                </div>
                <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                <div className="sub">{deck.length} cards remaining</div>
              </>
            )}
          </div>
        </div>

        <div className="panel" />
      </section>

      {/* ACTION BUTTONS — ALWAYS PRESENT */}
      <section className="actions">
        <button className="btn thumb">👍 Thumb</button>
        <button className="btn ready" onClick={startGame}>Ready</button>
        <button className="btn heaven">☁ Heaven</button>
      </section>

      <section className="status-bar">
        {statusText}
      </section>

      <section className="players">
        {players.map(p => (
          <div
            key={p.name}
            className={`player ${p.name === currentPlayer?.name ? "TURN" : ""} ${
              flashNames.has(p.name) ? "FLASH" : ""
            }`}
            onClick={() => tapPlayer(p.name)}
          >
            <div className="video-slot" />
            <span className="player-name">{p.name}</span>
            <span className="player-beers">🍺 {p.beers}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
