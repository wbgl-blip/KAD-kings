import { useState } from "react";
import "./App.css";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const shuffle = a => [...a].sort(() => Math.random() - 0.5);

const buildDeck = () => {
  const d = [];
  SUITS.forEach(s => RANKS.forEach(r => d.push({ suit: s, rank: r })));
  return shuffle(d);
};

function getRule(rank) {
  switch (rank) {
    case "A": return "Waterfall";
    case "4": return "Whores";
    case "6": return "Dicks";
    case "7": return "Heaven";
    case "9": return "Rhyme";
    case "J": return "Thumb Master";
    case "Q": return "Question Master";
    case "K": return "Make a rule";
    default: return "Drink";
  }
}

function getMedal(beers) {
  if (beers >= 15) return "👑 King of Degeneracy";
  if (beers >= 12) return "💀 Liquor Liability";
  if (beers >= 9) return "🥇 Walking DUI";
  if (beers >= 6) return "🥈 Menace to Sobriety";
  if (beers >= 3) return "🥉 Public Nuisance";
  return "";
}

export default function App() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [deck, setDeck] = useState([]);
  const [discard, setDiscard] = useState([]);
  const [turn, setTurn] = useState(0);
  const [powers, setPowers] = useState({ heaven:null, thumb:null, question:null });

  const currentCard = discard.at(-1);

  const addPlayer = () => {
    if (!name.trim()) return;
    setPlayers([...players, { name, beers: 0 }]);
    setName("");
  };

  const start = () => {
    setDeck(buildDeck());
    setDiscard([]);
    setTurn(0);
    setPowers({ heaven:null, thumb:null, question:null });
  };

  const draw = () => {
    const next = [...deck];
    const card = next.pop();
    const p = [...players];

    p[turn].beers++;

    if (card.rank === "7") setPowers(x => ({ ...x, heaven: p[turn].name }));
    if (card.rank === "J") setPowers(x => ({ ...x, thumb: p[turn].name }));
    if (card.rank === "Q") setPowers(x => ({ ...x, question: p[turn].name }));

    setPlayers(p);
    setDeck(next);
    setDiscard([...discard, card]);
    setTurn((turn + 1) % p.length);
  };

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {!deck.length && (
        <div className="setup">
          <div className="add">
            <input
              placeholder="Add degenerate"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button onClick={addPlayer}>Add</button>
          </div>

          <div className="lobby">
            {players.map((p,i) => (
              <div key={i} className="lobby-player">{p.name}</div>
            ))}
          </div>

          {players.length >= 2 && (
            <button className="start" onClick={start}>
              Start the Disaster
            </button>
          )}
        </div>
      )}

      {deck.length > 0 && (
        <>
          <div className="top-bar">
            <div className="turn">
              Turn: <span>{players[turn].name}</span>
            </div>
            <div className="powers">
              <span>👼 {powers.heaven || "—"}</span>
              <span>👍 {powers.thumb || "—"}</span>
              <span>❓ {powers.question || "—"}</span>
            </div>
          </div>

          <div className="table">
            {currentCard ? (
              <div className="card">
                <div className="corner tl">{currentCard.rank}{currentCard.suit}</div>
                <div className="suit">{currentCard.suit}</div>
                <div className="rule">{getRule(currentCard.rank)}</div>
                <div className="corner br">{currentCard.rank}{currentCard.suit}</div>
              </div>
            ) : (
              <div className="card placeholder">Draw</div>
            )}
          </div>

          <button className="draw" onClick={draw}>Draw Card</button>
          <div className="deck">Cards left: {deck.length}</div>

          <div className="players">
            {players.map((p,i) => (
              <div key={i} className={`player ${i===turn?"active":""}`}>
                <div className="p-name">{p.name}</div>
                <div className="p-beer">🍺 {p.beers}</div>
                <div className="p-medal">{getMedal(p.beers)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
