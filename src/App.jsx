import { useState } from "react"; import "./styles.css";

// ----------------------------- // CARD DATA (simple Kings demo) // ----------------------------- const SUITS = ["♠", "♥", "♦", "♣"]; const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const RULES = { A: "Waterfall. Hope you stretched.", 2: "You. Drink.", 3: "Me. Congrats, dumbass.", 4: "Floor. Gravity wins.", 5: "Guys drink.", 6: "Chicks drink.", 7: "Heaven. Hesitate = drink.", 8: "Pick a mate. Misery loves company.", 9: "Rhyme. Hesitate = drink.", 10: "Categories. You suck at this.", J: "Rule. This will be abused.", Q: "Question master. Annoy everyone.", K: "King. Pour some in the cup." };

function buildDeck() { const d = []; for (const s of SUITS) for (const v of VALUES) d.push({ suit: s, value: v }); return d.sort(() => Math.random() - 0.5); }

// ----------------------------- // APP // ----------------------------- export default function App() { const [players, setPlayers] = useState([ { id: 1, name: "dt", beers: 0 }, { id: 2, name: "vh", beers: 0 }, { id: 3, name: "rf", beers: 0 }, { id: 4, name: "hh", beers: 0 }, { id: 5, name: "gg", beers: 0 }, { id: 6, name: "fff", beers: 0 } ]);

const [deck, setDeck] = useState(buildDeck()); const [card, setCard] = useState(null); const [turn, setTurn] = useState(0); const [editingPlayerId, setEditingPlayerId] = useState(null);

const activeId = players[turn]?.id;

function drawCard() { if (deck.length === 0) return; const [next, ...rest] = deck; setDeck(rest); setCard(next); setTurn((t) => (t + 1) % players.length); }

function adjustBeers(id, delta) { setPlayers((prev) => prev.map((p) => p.id === id ? { ...p, beers: Math.max(0, p.beers + delta) } : p ) ); }

function updatePlayerName(id, newName) { setPlayers((prev) => prev.map((p) => p.id === id ? { ...p, name: newName.trim() || p.name } : p ) ); }

return ( <div className="app"> <h1 className="title">KAD Kings</h1>

<div className="table">
    {/* LEFT SIDE (3) */}
    <div className="side left">
      {players.slice(0, 3).map((p) => (
        <Player
          key={p.id}
          player={p}
          active={p.id === activeId}
          editingPlayerId={editingPlayerId}
          setEditingPlayerId={setEditingPlayerId}
          updatePlayerName={updatePlayerName}
          adjustBeers={adjustBeers}
        />
      ))}
    </div>

    {/* CENTER */}
    <div className="center">
      <div className="card">
        {card ? (
          <>
            <div className="card-value">{card.value}{card.suit}</div>
            <div className="card-rule">{RULES[card.value]}</div>
          </>
        ) : (
          <div className="card-placeholder">Draw to start</div>
        )}
      </div>

      <button className="draw-btn" onClick={drawCard}>
        DRAW
      </button>

      <div className="deck-left">Cards left: {deck.length}</div>
    </div>

    {/* RIGHT SIDE (3) */}
    <div className="side right">
      {players.slice(3).map((p) => (
        <Player
          key={p.id}
          player={p}
          active={p.id === activeId}
          editingPlayerId={editingPlayerId}
          setEditingPlayerId={setEditingPlayerId}
          updatePlayerName={updatePlayerName}
          adjustBeers={adjustBeers}
        />
      ))}
    </div>
  </div>
</div>

); }

// ----------------------------- // PLAYER COMPONENT // ----------------------------- function Player({ player, active, editingPlayerId, setEditingPlayerId, updatePlayerName, adjustBeers }) { return ( <div className={player ${active ? "active" : ""}}> {editingPlayerId === player.id ? ( <input className="player-name-input" value={player.name} autoFocus maxLength={12} onChange={(e) => updatePlayerName(player.id, e.target.value)} onBlur={() => setEditingPlayerId(null)} onKeyDown={(e) => { if (e.key === "Enter") setEditingPlayerId(null); }} /> ) : ( <div className="player-name" onClick={() => setEditingPlayerId(player.id)} > {player.name} </div> )}

<div className="beer-controls">
    <button onClick={() => adjustBeers(player.id, -1)}>-</button>
    <span>🍺 {player.beers}</span>
    <button onClick={() => adjustBeers(player.id, 1)}>+</button>
  </div>
</div>

); }
