import { useReducer } from "react";
import "./App.css";

/* ---------- CARD DECK ---------- */
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  for (let v of VALUES) {
    for (let s of SUITS) {
      deck.push({ value: v, suit: s });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function ruleForCard(card) {
  switch (card.value) {
    case "7":
      return "Heaven. Last one up drinks.";
    case "J":
      return "Thumb Master. Last thumb down drinks.";
    case "Q":
      return "Questions. Answer = drink.";
    case "4":
      return "Whores. Everyone drinks.";
    case "K":
      return "King. You’re closer to death.";
    default:
      return "Drink.";
  }
}

/* ---------- MEDALS ---------- */
function generateMedals(players) {
  const sorted = [...players].sort((a, b) => b.beers - a.beers);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const medals = [];

  medals.push({
    title: "🍺 Alcoholic of the Night",
    player: top.name,
    text: "Absolutely unhinged. Society has concerns.",
  });

  if (top.beers >= 6) {
    medals.push({
      title: "☠️ Menace to Sobriety",
      player: top.name,
      text: "Single-handedly ruined tomorrow.",
    });
  }

  if (bottom.beers <= 1) {
    medals.push({
      title: "🥛 Designated Liability",
      player: bottom.name,
      text: "Why were you even here?",
    });
  }

  medals.push({
    title: "🤡 Peer Pressure Failure",
    player: bottom.name,
    text: "Watched everyone drink and did nothing.",
  });

  return medals;
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

/* ---------- REDUCER ---------- */
function reducer(state, action) {
  switch (action.type) {
    case "DRAW": {
      if (state.deck.length === 0) return state;

      const [card, ...rest] = state.deck;

      const updates = {
        currentCard: card,
        deck: rest,
      };

      if (card.value === "7") updates.heaven = action.player;
      if (card.value === "J") updates.thumb = action.player;
      if (card.value === "Q") updates.questions = action.player;

      if (rest.length === 0) updates.gameOver = true;

      return { ...state, ...updates };
    }

    case "BEER":
      return {
        ...state,
        players: state.players.map((p) =>
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

  const medals = state.gameOver ? generateMedals(state.players) : [];

  return (
    <div className="app">
      <h1 className="title">KAD Kings</h1>

      {/* PLAYERS */}
      <div className="table">
        {state.players.map((p, i) => (
          <div key={p.id} className={`player seat-${i}`}>
            <div className="player-name">{p.name}</div>

            <div className="beer-controls">
              <button
                className="beer-btn"
                onClick={() =>
                  dispatch({ type: "BEER", id: p.id, delta: -1 })
                }
              >
                −
              </button>

              <span className="beer-count">🍺 {p.beers}</span>

              <button
                className="beer-btn"
                onClick={() =>
                  dispatch({ type: "BEER", id: p.id, delta: 1 })
                }
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CARD */}
      {state.currentCard && (
        <div className="card">
          <div className="card-corner">
            {state.currentCard.value}
            {state.currentCard.suit}
          </div>

          <div className="card-center">
            {state.currentCard.suit}
            <div className="card-rule">
              {ruleForCard(state.currentCard)}
            </div>
          </div>

          <div className="card-corner bottom">
            {state.currentCard.value}
            {state.currentCard.suit}
          </div>
        </div>
      )}

      {/* CONTROLS */}
      <div className="center-controls">
        <button
          className="draw-button"
          onClick={() =>
            dispatch({
              type: "DRAW",
              player: state.players[0].name,
            })
          }
        >
          Draw Card
        </button>

        <div className="deck-count">
          Cards left: {state.deck.length}
        </div>

        <div className="powers">
          😇 Heaven: {state.heaven || "—"} <br />
          👍 Thumb: {state.thumb || "—"} <br />
          ❓ Questions: {state.questions || "—"}
        </div>
      </div>

      {/* END GAME */}
      {state.gameOver && (
        <div className="endgame">
          <h2>Final Damage Report</h2>

          <ul>
            {[...state.players]
              .sort((a, b) => b.beers - a.beers)
              .map((p) => (
                <li key={p.id}>
                  {p.name}: 🍺 {p.beers}
                </li>
              ))}
          </ul>

          <h3>Medals</h3>
          {medals.map((m, i) => (
            <div key={i} className="medal">
              <strong>{m.title}</strong>
              <div>{m.player}</div>
              <small>{m.text}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
