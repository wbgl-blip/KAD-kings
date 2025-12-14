import { useReducer, useEffect, useState } from "react";
import "./App.css";

/* ---------- DECK ---------- */
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  for (let v of VALUES) for (let s of SUITS) deck.push({ value: v, suit: s });
  return deck.sort(() => Math.random() - 0.5);
}

function ruleForCard(card) {
  switch (card.value) {
    case "7": return "Heaven. Last one up drinks.";
    case "J": return "Thumb. Last down drinks.";
    case "Q": return "Questions. Answer = drink.";
    default: return "Drink.";
  }
}

/* ---------- STATE ---------- */
const initialState = {
  players: [
    { id: "p1", name: "dt", beers: 0 },
    { id: "p2", name: "vh", beers: 0 },
    { id: "p3", name: "rf", beers: 0 },
    { id: "p4", name: "fff", beers: 0 },
  ],
  deck: buildDeck(),
  currentCard: null,
  heaven: null,
  thumb: null,
  questions: null,
  gameOver: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "DRAW": {
      if (!state.deck.length) return state;
      const [card, ...rest] = state.deck;
      return {
        ...state,
        currentCard: card,
        deck: rest,
        heaven: card.value === "7" ? action.player : state.heaven,
        thumb: card.value === "J" ? action.player : state.thumb,
        questions: card.value === "Q" ? action.player : state.questions,
        gameOver: rest.length === 0,
      };
    }

    case "BEER":
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.id
            ? { ...p, beers: Math.max(0, p.beers + action.delta) }
            : p
        ),
      };

    default:
      return state;
  }
}

/* ---------- APP ---------- */
export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Horseshoe positions (mobile tuned)
  const positions = [
    { top: "18%", left: "50%", transform: "translateX(-50%)" },
    { top: "38%", left: "8%" },
    { top: "38%", right: "8%" },
    { top: "60%", left: "50%", transform: "translateX(-50%)" },
  ];

  return (
    <div className="app" style={{ position: "relative", minHeight: "100vh" }}>
      <h1 className="title">KAD Kings</h1>

      {/* TABLE */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "60vh",
          marginTop: "20px",
        }}
      >
        {state.players.map((p, i) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              ...positions[i],
              background: "#111",
              padding: "14px 18px",
              borderRadius: "16px",
              boxShadow: "0 0 18px rgba(255,255,255,0.08)",
              minWidth: "220px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "6px" }}>
              {p.name}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <button onClick={() => dispatch({ type: "BEER", id: p.id, delta: -1 })}>
                −
              </button>
              <span>🍺 {p.beers}</span>
              <button onClick={() => dispatch({ type: "BEER", id: p.id, delta: 1 })}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CENTER */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
        {state.currentCard && (
          <div className="card">
            <div>
              {state.currentCard.value}
              {state.currentCard.suit}
            </div>
            <div className="card-rule">
              {ruleForCard(state.currentCard)}
            </div>
          </div>
        )}

        <button
          className="draw-button"
          onClick={() =>
            dispatch({ type: "DRAW", player: state.players[0].name })
          }
        >
          Draw Card
        </button>

        <div>Cards left: {state.deck.length}</div>

        <div style={{ marginTop: "6px" }}>
          😇 {state.heaven || "—"} &nbsp;|&nbsp;
          👍 {state.thumb || "—"} &nbsp;|&nbsp;
          ❓ {state.questions || "—"}
        </div>
      </div>
    </div>
  );
}
