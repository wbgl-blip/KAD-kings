import "./styles.css";

const players = [
  { name: "Beau", beers: 0 },
  { name: "Mike", beers: 0 },
  { name: "Jess", beers: 0 },
  { name: "Alex", beers: 0 },
  { name: "Emily", beers: 0 },
  { name: "Sean", beers: 0 },
  { name: "Tom", beers: 0 },
  { name: "Natalie", beers: 0 },
];

function Player({ player, active }) {
  return (
    <div className={`player ${active ? "active" : ""}`}>
      <div className="avatar" />
      <div className="name">{player.name}</div>
      <div className="beers">🍺 {player.beers}</div>
      <div className="add-beer">+1 Beer</div>
    </div>
  );
}

export default function App() {
  return (
    <div className="board">
      <h1 className="title">KAD Kings</h1>

      {/* TOP */}
      <div className="players top">
        {players.slice(0, 2).map((p, i) => (
          <Player key={i} player={p} />
        ))}
      </div>

      {/* LEFT */}
      <div className="players left">
        {players.slice(2, 4).map((p, i) => (
          <Player key={i} player={p} />
        ))}
      </div>

      {/* CENTER */}
      <div className="center">
        <div className="card">
          <div className="card-title">Draw a card</div>
          <div className="card-sub">No mercy</div>
        </div>

        <button className="draw">DRAW CARD</button>
        <div className="cards-left">Cards Left: 52 / 52</div>
      </div>

      {/* RIGHT */}
      <div className="players right">
        {players.slice(4, 6).map((p, i) => (
          <Player key={i} player={p} />
        ))}
      </div>

      {/* BOTTOM */}
      <div className="players bottom">
        {players.slice(6, 8).map((p, i) => (
          <Player key={i} player={p} />
        ))}
      </div>
    </div>
  );
}
