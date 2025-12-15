import { useState } from "react";

export default function App() {
  const [players, setPlayers] = useState([
    { id: 1, name: "Player 1", beers: 0 },
    { id: 2, name: "Player 2", beers: 0 },
    { id: 3, name: "Player 3", beers: 0 },
  ]);

  const [turnIndex, setTurnIndex] = useState(0);

  const addBeer = (id) => {
    setPlayers(players.map(p => p.id === id ? { ...p, beers: p.beers + 1 } : p));
  };

  const removePlayer = (id) => {
    const filtered = players.filter(p => p.id !== id);
    setPlayers(filtered);
    if (turnIndex >= filtered.length) setTurnIndex(0);
  };

  const updateName = (id, name) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name } : p));
  };

  const addPlayer = () => {
    setPlayers([...players, { id: Date.now(), name: "New Player", beers: 0 }]);
  };

  const nextTurn = () => {
    setTurnIndex((turnIndex + 1) % players.length);
  };

  return (
    <div className="app">
      <h1>KINGS</h1>

      <ul className="player-list">
        {players.map((p, i) => (
          <li
            key={p.id}
            className={`player-card ${i === turnIndex ? "active" : ""}`}
          >
            <input
              value={p.name}
              onChange={(e) => updateName(p.id, e.target.value)}
            />

            <div className="stats">
              🍺 {p.beers}
            </div>

            <div className="actions">
              <button onClick={() => addBeer(p.id)}>+1 Beer</button>
              <button className="danger" onClick={() => removePlayer(p.id)}>✕</button>
            </div>

            {i === turnIndex && <div className="turn">👉 Current Turn</div>}
          </li>
        ))}
      </ul>

      <button className="add" onClick={addPlayer}>+ Add Player</button>
      <button className="draw" onClick={nextTurn}>DRAW</button>
    </div>
  );
}
