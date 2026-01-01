import { useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULE_TEXT = {
  A: "Waterfall — wait for ready, drawer drinks first",
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
  // WAITING | IDLE | PICK_DRINK | PICK_MATE | THUMB_RACE | HEAVEN_RACE | QUESTION_PICK | MAKE_RULE

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map(name => ({
      name,
      beers: 0,
      gender: "M",
      mates: [],
    }))
  );

  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");

  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);
  const [questionHolder, setQuestionHolder] = useState(null);

  const [raceReacted, setRaceReacted] = useState(new Set());
  const [flashNames, setFlashNames] = useState(new Set());

  const flashTimer = useRef(null);
  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = players[turnIndex];

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
      p.map(pl => pl.name === name ? { ...pl, beers: pl.beers + 1 } : pl)
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
    if (r === "J") return setThumbHolder(currentPlayer.name);
    if (r === "7") return setHeavenHolder(currentPlayer.name);
    if (r === "Q") return setQuestionHolder(currentPlayer.name);
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
     RACES
  ========================= */

  function startThumb() {
    if (!thumbHolder) return;
    setRaceReacted(new Set());
    setPhase("THUMB_RACE");
    setStatusText("Thumbmaster active — tap your tile!");
  }

  function startHeaven() {
    if (!heavenHolder) return;
    setRaceReacted(new Set());
    setPhase("HEAVEN_RACE");
    setStatusText("Heaven active — tap your tile!");
  }

  function handleRaceTap(name) {
    if (raceReacted.has(name)) return;

    const next = new Set(raceReacted);
    next.add(name);
    setRaceReacted(next);

    if (next.size === playersRef.current.length - 1) {
      const loser = playersRef.current.find(p => !next.has(p.name)).name;
      flash([loser]);
      propagateDrink(loser);
      setPhase("IDLE");
      setStatusText(`${loser} was last — drinks`);
      nextTurn();
    }
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
      return;
    }

    if (phase === "THUMB_RACE" || phase === "HEAVEN_RACE") {
      handleRaceTap(name);
      return;
    }

    if (phase === "QUESTION_PICK") {
      flash([name]);
      propagateDrink(name);
      setPhase("IDLE");
      setStatusText(`${name} answered — drinks`);
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
          <div className="card draw" onClick={drawCard}>
            {card ? (
              <>
                <div className="rank">{card.rank}{card.suit}</div>
                <div className="sub">{deck.length} cards left</div>
              </>
            ) : "DRAW"}
          </div>
        </div>
        <div className="panel" />
      </section>

      <section className="actions">
        <button className="btn thumb" onClick={startThumb}>👍 Thumb</button>
        <button className="btn ready" onClick={startGame}>Ready</button>
        <button className="btn heaven" onClick={startHeaven}>☁ Heaven</button>
      </section>

      <section className="status-bar">{statusText}</section>

      <section className="players">
        {players.map(p => (
          <div
            key={p.name}
            className={`player ${p.name === currentPlayer?.name ? "TURN" : ""} ${flashNames.has(p.name) ? "FLASH" : ""}`}
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
