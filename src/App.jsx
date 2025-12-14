import { useState } from "react";
import "./App.css";

/* =========================
   DECK
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const shuffle = a => [...a].sort(() => Math.random() - 0.5);

const buildDeck = () => {
  const d = [];
  SUITS.forEach(s => RANKS.forEach(r => d.push({ suit: s, rank: r })));
  return shuffle(d);
};

/* =========================
   RULES
========================= */
function getRuleText(rank) {
  switch (rank) {
    case "A": return "Waterfall. Everyone drinks.";
    case "4": return "Whores. Everyone drinks.";
    case "6": return "Dicks. Everyone drinks again.";
    case "7": return "Heaven. Last hand up drinks.";
    case "9": return "Rhyme. Loser drinks.";
    case "J": return "Thumb Master.";
    case "Q": return "Question Master.";
    case "K": return "Make a rule.";
    default: return "Drink.";
  }
}

/* =========================
   MEDALS
========================= */
function getMedal(beers) {
  if (beers >= 15) return "👑 King of Degeneracy";
  if (beers >= 12) return "💀 Liquor Liability";
  if (beers >= 9) return "🥇 Walking DUI";
  if (beers >= 6) return "🥈 Menace to Sobriety";
  if (beers >= 3) return "🥉 Public Nuisance";
  return "";
}

/* =========================
   APP
========================= */
export default function App() {
  const [players, setPlayers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [turn, setTurn] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [powers, setPowers] = useState({
    heaven: null,
    thumb: null,
    question: null
  });

  function addPlayer() {
    if (!nameInput.trim()) return;
    setPlayers([...players, { name: nameInput, beers: 0 }]);
    setNameInput("");
  }

  function startGame() {
    if (players.length < 2) return;
    setDeck(buildDeck());
    setDiscard([]);
    setTurn(0);
    setGameOver(false);
    setPowers({ heaven: null, thumb: null, question: null });
  }

  function drawCard() {
    if (!deck.length) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();
    const updated = [...players];
    const current = updated[turn];

    if (card.rank === "7") setPowers(p => ({ ...p, heaven: current.name }));
    if (card.rank === "J") setPowers(p => ({ ...p, thumb: current.name }));
    if (card.rank === "Q") setPowers(p => ({ ...p, question: current.name }));

    current.beers += 1;

    setPlayers(updated);
    setDeck(nextDeck);
    setDiscard([...discard, card]);

    if (!nextDeck.length) setGameOver(true);
    else setTurn((turn + 1) % players.length);
  }

  const card = discard[discard.length - 1];

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {deck.length === 0 && !gameOver && (
        <div className="setup">
          <input
            value={nameInput}
            placeholder="Add degenerate"
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add</button>

          <ul className="player-list">
            {players.map((p, i) => <li key={i}>{p.name}</li>)}
          </ul>

          <button className="start" onClick={startGame}>
            Start the Disaster
          </button>
        </div>
      )}

      {deck.length > 0 && !gameOver && (
        <>
          <h2 className="turn">
            Turn: <span>{players[turn].name}</span>
          </h2>

          <div className="powers">
            <p>👼 {powers.heaven || "—"}</p>
            <p>👍 {powers.thumb || "—"}</p>
            <p>❓ {powers.question || "—"}</p>
          </div>

          <button className="draw" onClick={drawCard}>Draw Card</button>
          <p className="count">Cards left: {deck.length}</p>

          {card && (
            <div className="card">
              <div className="corner top">{card.rank}{card.suit}</div>
              <div className="center">{card.suit}</div>
              <div className="corner bottom">{card.rank}{card.suit}</div>
              <div className="rule">{getRuleText(card.rank)}</div>
            </div>
          )}

          <ul className="scores">
            {players.map((p, i) => (
              <li key={i} className={i === turn ? "active" : ""}>
                <div className="name">{p.name}</div>
                <div className="beer">🍺 {p.beers}</div>
                <div className="medal">{getMedal(p.beers)}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {gameOver && (
        <div className="game-over">
          <h2>Deck Empty</h2>
          <p>No winners. Only survivors.</p>
        </div>
      )}
    </div>
  );
}
