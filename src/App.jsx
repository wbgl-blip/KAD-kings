import { useState } from "react";

export default function App() {
  const [players, setPlayers] = useState([
    { id: 1, name: "Player 1", beers: 0 },
    { id: 2, name: "Player 2", beers: 0 },
    { id: 3, name: "Player 3", beers: 0 }
  ]);

  const updateName = (id, newName) => {
    setPlayers(players.map(p =>
      p.id === id ? { ...p, name: newName } : p
    ));
  };

  const addBeer = (id) => {
    setPlayers(players.map(p =>
      p.id === id ? { ...p, beers: p.beers + 1 } : p
    ));
  };

  return (
    <div className="app">
      <h1>KINGS</h1>

      <div className="players">
        {players.map(player => (
          <div key={player.id} className="player">
            <input
              value={player.name}
              onChange={(e) => updateName(player.id, e.target.value)}
            />

            <div className="beer-count">
              🍺 {player.beers}
            </div>

            <button onClick={() => addBeer(player.id)}>
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      <h2>DRAW</h2>
      <button className="draw-btn">Draw Card</button>
    </div>
  );
}
