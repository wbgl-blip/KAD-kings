import { useState } from "react";
import "./App.css";

/* =========================
   DECK
========================= */
const SUITS = ["♠","♥","♦","♣"];
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
function ruleText(rank) {
  switch (rank) {
    case "A": return "Waterfall — everyone drinks";
    case "2": return "You — pick someone to drink";
    case "3": return "Me — you drink";
    case "4": return "Whores — we all drink";
    case "5": return "Guys drink";
    case "6": return "Dicks — we all drink";
    case "7": return "Heaven — last hand up drinks";
    case "8": return "Mate — pick a drinking partner";
    case "9": return "Rhyme — loser drinks";
    case "10": return "Categories — loser drinks";
    case "J": return "Thumb Master";
    case "Q": return "Question Master";
    case "K": return "Make a rule";
    default: return "";
  }
}

/* =========================
   ENDGAME MEDALS (HARSH)
========================= */
function medalsFor(beers) {
  const medals = [];

  if (beers >= 3) medals.push("🥉 Still Made Bad Choices");
  if (beers >= 5) medals.push("🥉 Zero Self-Control");
  if (beers >= 7) medals.push("🥈 Menace to Sobriety");
  if (beers >= 9) medals.push("🥈 Actively Ruining Tomorrow");
  if (beers >= 11) medals.push("🥇 Walking Liability");
  if (beers >= 13) medals.push("🥇 Should’ve Known Better");
  if (beers >= 15) medals.push("☠️ This App Is Evidence");

  return medals;
}

function roastLine(beers) {
  if (beers >= 15) return "You were the problem. Everyone knows it.";
  if (beers >= 13) return "No one made you do this. You chose violence.";
  if (beers >= 11) return "You escalated things for no reason.";
  if (beers >= 9) return "You could have stopped. You didn’t.";
  if (beers >= 7) return "You were warned. Repeatedly.";
  if (beers >= 5) return "Not impressive. Still embarrassing.";
  return "You tried. Bare minimum.";
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

  const [heaven, setHeaven] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [question, setQuestion] = useState(null);

  /* SETUP */
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
    setHeaven(null);
    setThumb(null);
    setQuestion(null);
  }

  /* GAME */
  function drawCard() {
    if (!deck.length) return;

    const nextDeck = [...deck];
    const card = nextDeck.pop();

    if (card.rank === "7") setHeaven(players[turn].name);
    if (card.rank === "J") setThumb(players[turn].name);
    if (card.rank === "Q") setQuestion(players[turn].name);

    setDeck(nextDeck);
    setDiscard([...discard, card]);

    if (nextDeck.length === 0) {
      setGameOver(true);
    } else {
      setTurn((turn + 1) % players.length);
    }
  }

  function adjustBeer(i, amt) {
    const p = [...players];
    p[i].beers = Math.max(0, p[i].beers + amt);
    setPlayers(p);
  }

  const currentCard = discard.at(-1);

  /* RENDER */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* SETUP */}
      {!deck.length && !gameOver && (
        <div className="setup">
          <input
            placeholder="Add degenerate"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
          />
          <button onClick={addPlayer}>Add</button>

          <div className="lobby">
            {players.map((p,i) => (
              <div key={i} className="lobby-player">{p.name}</div>
            ))}
          </div>

          {players.length >= 2 && (
            <button className="start" onClick={startGame}>
              Start the Disaster
            </button>
          )}
        </div>
      )}

      {/* GAME */}
      {deck.length > 0 && !gameOver && (
        <>
          <div className="top">
            <div>Turn: <span className="active">{players[turn].name}</span></div>
            <div className="roles">
              👼 {heaven || "—"} | 👍 {thumb || "—"} | ❓ {question || "—"}
            </div>
          </div>

          <div className="card">
            {currentCard ? (
              <>
                <div className="corner tl">{currentCard.rank}{currentCard.suit}</div>
                <div className="suit">{currentCard.suit}</div>
                <div className="rule">{ruleText(currentCard.rank)}</div>
                <div className="corner br">{currentCard.rank}{currentCard.suit}</div>
              </>
            ) : "Draw"}
          </div>

          <button className="draw" onClick={drawCard}>Draw Card</button>
          <div className="deck">Cards left: {deck.length}</div>

          <div className="players">
            {players.map((p,i) => (
              <div key={i} className={`player ${i===turn?"active":""}`}>
                <div className="name">{p.name}</div>
                <div className="beer">🍺 {p.beers}</div>
                <div className="controls">
                  <button onClick={() => adjustBeer(i,1)}>+</button>
                  <button onClick={() => adjustBeer(i,-1)}>−</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ENDGAME */}
      {gameOver && (
        <div className="end">
          <h2>Game Over</h2>
          {[...players]
            .sort((a,b) => b.beers - a.beers)
            .map((p,i) => (
              <div key={i} className="end-player">
                <div className="end-name">{p.name} — 🍺 {p.beers}</div>
                <div className="medals">
                  {medalsFor(p.beers).map((m,idx) => (
                    <div key={idx}>{m}</div>
                  ))}
                </div>
                <div className="roast">{roastLine(p.beers)}</div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
