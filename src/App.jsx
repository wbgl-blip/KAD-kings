import { useState } from "react";

const seats = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  name: "",
  beers: 0,
}));

export default function App() {
  const [players, setPlayers] = useState(seats);
  const [turn, setTurn] = useState(0);

  const setName = (id, name) => {
    setPlayers(p =>
      p.map(player =>
        player.id === id ? { ...player, name } : player
      )
    );
  };

  const addBeer = (id) => {
    setPlayers(p =>
      p.map(player =>
        player.id === id ? { ...player, beers: player.beers + 1 } : player
      )
    );
  };

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="grid">
        {players.map((p, i) => (
          <div key={p.id} className={`card ${i === turn ? "active" : ""}`}>
            <input
              placeholder={`Seat ${i + 1}`}
              value={p.name}
              onChange={(e) => setName(p.id, e.target.value)}
            />

            <div className="beer">
              <span>🍺 {p.beers}</span>
              <button onClick={() => addBeer(p.id)}>+1</button>
            </div>

            {i === turn && <div className="turn">👉 Current Turn</div>}
          </div>
        ))}
      </div>

      <button className="draw" onClick={() => setTurn((turn + 1) % players.length)}>
        Draw Card
      </button>
    </div>
  );
}
