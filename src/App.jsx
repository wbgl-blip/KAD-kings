import { useMemo, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone",
  3: "Me",
  4: "Everyone",
  5: "Guys",
  6: "Everyone",
  7: "Heaven",
  8: "Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumb",
  Q: "Questions",
  K: "Make a Rule",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

/* =========================
   DECK
========================= */

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

  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  function drawCard() {
    if (!deck.length) return;
    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);

    if (r === "J") setThumbHolder(currentPlayer);
    if (r === "7") setHeavenHolder(currentPlayer);

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  return (
    <div className="app">

      {/* TOP BAR */}
      <div className="topbar">
        <div className="roomchip">
          <span className="roomlabel">ROOM</span>
          <span className="roomcode">KAD-732</span>
          <span className="roomhint">tap to copy</span>
        </div>
        <button className="hostbtn">Host</button>
      </div>

      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>

      <div className="status">
        {CARD_RULES[currentRank] || "Draw a card"}
      </div>

      {/* CONTROL BAR */}
      <div className="control-bar">
        <div className="control-spacer" />

        <div className={`card ${card ? "draw" : ""}`} onClick={drawCard}>
          {card ? (
            <>
              <div className="rank">{card}</div>
              <div className="rule">{CARD_RULES[currentRank]}</div>
            </>
          ) : (
            <div className="rank">DRAW</div>
          )}
        </div>

        <div className="pills">
          <div className="pill">👍 Thumb: {thumbHolder || "—"}</div>
          <div className="pill">☁️ Heaven: {heavenHolder || "—"}</div>
        </div>
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player ${p === currentPlayer ? "turn" : ""}`}
          >
            <div className="badges">
              {p === currentPlayer && <span className="badge turn">TURN</span>}
              {p === thumbHolder && <span className="badge thumb">THUMB</span>}
              {p === heavenHolder && <span className="badge heaven">HEAVEN</span>}
              {p === "Wes" && <span className="badge host">HOST</span>}
            </div>

            <div className="name">{p}</div>

            <div className="tilebottom">
              <div className="beer">🍺 {beers[p]}</div>
              <div className="mini">live</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
