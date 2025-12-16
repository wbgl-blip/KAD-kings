import "./styles.css";

const players = [
  { name: "Beau", beers: 0 },
  { name: "Mike", beers: 0 },
  { name: "Jess", beers: 0 },
  { name: "Alex", beers: 0 },
  { name: "Emily", beers: 0 },
  { name: "Sean", beers: 0 },
  { name: "Chris", beers: 0 },
  { name: "Taylor", beers: 0 },
];

function Player({ player }) {
  return (
    <div className="player">
      <div className="avatar" />
      <div className="name">{player.name}</div>
      <div className="stats">🍺 {player.beers}</div>
      <div className="penalty">+1 Beer</div>
    </div>
  );
}

export default function App() {
  return (
    <div className="board">
      <h1 className="title">KAD Kings</h1>

      {/* TOP PLAYERS */}
      <div className="players top">
        {players.slice(0, 2).map((p) => (
          <Player key={p.name} player={p} />
        ))}
      </div>

      {/* LEFT PLAYERS */}
      <div className="players left">
        {players.slice(2, 4).map((p) => (
          <Player key={p.name} player={p} />
        ))}
      </div>

      {/* RIGHT PLAYERS */}
      <div className="players right">
        {players.slice(4, 6).map((p) => (
          <Player key={p.name} player={p} />
        ))}
      </div>

      {/* CENTER CARD */}
      <div className="center">
        <div className="card">
          <p>Draw a card</p>
          <p>No mercy</p>
        </div>

        <button className="draw-btn">DRAW CARD</button>
        <div className="cards-left">Cards Left: 52 / 52</div>
      </div>

      {/* BOTTOM PLAYERS (FIXED 🔧) */}
      <div className="players bottom">
        {players.slice(6, 8).map((p) => (
          <Player key={p.name} player={p} />
        ))}
      </div>
    </div>
  );
}
