import { useState } from "react";
import "./App.css";

/* =========================
   DECK
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function buildDeck() {
  const deck = [];
  SUITS.forEach(s =>
    RANKS.forEach(r => deck.push({ suit: s, rank: r }))
  );
  return deck.sort(() => Math.random() - 0.5);
}

/* =========================
   RULES
========================= */
function ruleText(rank) {
  switch (rank) {
    case "A": return "Waterfall. Everyone drinks.";
    case "2": return "You. Pick a victim.";
    case "3": return "Me. Suffer.";
    case "4": return "Whores. All drink.";
    case "5": return "Guys drink.";
    case "6": return "Dicks. All drink.";
    case "7": return "Heaven. Last hand drinks.";
    case "8": return "Mate. You’re not alone.";
    case "9": return "Rhyme. Stumble and drink.";
    case "10": return "Categories. Think fast idiot.";
    case "J": return "Thumb Master.";
    case "Q": return "Question Master.";
    case "K": return "Make a rule. Ruin lives.";
    default: return "";
  }
}

/* =========================
   MEDALS (LOW NUMBERS)
========================= */
function medal(beers) {
  if (beers >= 12) return "🏆 Absolute Liability";
  if (beers >= 9) return "🥇 Menace to Sobriety";
  if (beers >= 6) return "🥈 Functional Alcoholic";
  if (beers >= 3) return "🥉 Trying Their Best";
  return "🚰 Hydration Hero (Shame)";
}

function shitTalk(beers) {
  if (beers < 2) return "Did you even fucking play?";
  if (beers < 4) return "Nursing that drink like a bitch.";
  if (beers < 7) return "Respectable. Barely.";
  if (beers < 10) return "You’re a problem.";
  return "Seek help. Or another beer.";
}

/* =========================
   APP
========================= */
export default function App() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [turn, setTurn] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Persistent roles
  const [heaven, setHeaven] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [questions, setQuestions] = useState(null);

  /* =========================
     SETUP
  ========================= */
  function addPlayer() {
    if (!name.trim()) return;
    setPlayers([...players, { name, beers: 0 }]);
    setName("");
  }

  function startGame() {
    if (players.length < 2) return;
    setDeck(buildDeck());
    setDiscard([]);
    setTurn(0);
    setGameOver(false);
    setHeaven(null);
    setThumb(null);
    setQuestions(null);
  }

  /* =========================
     DRAW
  ========================= */
  function drawCard() {
    if (deck.length === 0) return;

    const next = [...deck];
    const card = next.pop();

    if (card.rank === "7") setHeaven(players[turn].name);
    if (card.rank === "J") setThumb(players[turn].name);
    if (card.rank === "Q") setQuestions(players[turn].name);

    setDeck(next);
    setDiscard([...discard, card]);

    if (next.length === 0) {
      setGameOver(true);
    } else {
      setTurn((turn + 1) % players.length);
    }
  }

  /* =========================
     BEER CONTROL
  ========================= */
  function adjustBeer(i, delta) {
    const updated = [...players];
    updated[i].beers = Math.max(0, updated[i].beers + delta);
    setPlayers(updated);
  }

  const card = discard[discard.length - 1];

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* SETUP */}
      {deck.length === 0 && !gameOver && (
        <>
          <input
            value={name}
            placeholder="Add degenerate"
            onChange={e => setName(e.target.value)}
          />
          <button onClick={addPlayer}>Add</button>

          <div className="players">
            {players.map((p, i) => (
              <div key={i} className="player">
                {p.name}
              </div>
            ))}
          </div>

          <button className="draw" onClick={startGame}>
            Start the Disaster
          </button>
        </>
      )}

      {/* GAME */}
      {deck.length > 0 && !gameOver && (
        <div className="game">
          <div className="players">
            {players.map((p, i) => (
              <div
                key={i}
                className={`player ${i === turn ? "active" : ""}`}
              >
                <div className="name">{p.name}</div>
                <div className="beer-row">
                  <button onClick={() => adjustBeer(i, -1)}>-</button>
                  <span>🍺 {p.beers}</span>
                  <button onClick={() => adjustBeer(i, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="card-zone">
            {card && (
              <div className="card">
                <div className="corner top">
                  {card.rank}{card.suit}
                </div>

                <div className="center">
                  <div className="suit">{card.suit}</div>
                  <div className="rule">{ruleText(card.rank)}</div>
                </div>

                <div className="corner bottom">
                  {card.rank}{card.suit}
                </div>
              </div>
            )}

            <button className="draw" onClick={drawCard}>
              Draw Card
            </button>

            <div className="left">Cards left: {deck.length}</div>

            <div className="powers">
              👼 Heaven: {heaven || "—"} <br />
              👍 Thumb: {thumb || "—"} <br />
              ❓ Questions: {questions || "—"}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gameOver && (
        <>
          <h2>Scoreboard</h2>

          <div className="scoreboard">
            {[...players]
              .sort((a, b) => b.beers - a.beers)
              .map((p, i) => (
                <div key={i} className="score-row">
                  <div className="score-name">{p.name}</div>
                  <div className="score-beer">🍺 {p.beers}</div>
                  <div className="score-medal">{medal(p.beers)}</div>
                  <div className="shittalk">{shitTalk(p.beers)}</div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
