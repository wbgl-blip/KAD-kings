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

export default function KingsBoard() {
  const renderPlayer = (player, i) => (
    <div key={i} className="player">
      <div className="avatar" />
      <div className="name">{player.name}</div>
      <div className="beers">🍺 {player.beers}</div>
      <button className="beer-btn">+1 Beer</button>
    </div>
  );

  return (
    <div className="board">
      <h1 className="title">KAD Kings</h1>

      {/* TOP */}
      <div className="players top">
        {players.slice(0, 2).map(renderPlayer)}
      </div>

      {/* LEFT */}
      <div className="players left">
        {players.slice(2, 4).map(renderPlayer)}
      </div>

      {/* CENTER CARD */}
      <div className="center">
        <div className="card">
          <div className="card-text">
            <div>Draw a card</div>
            <div className="sub">No mercy</div>
          </div>
        </div>

        <button className="draw-btn">DRAW CARD</button>
        <div className="cards-left">Cards Left: 52 / 52</div>
      </div>

      {/* RIGHT */}
      <div className="players right">
        {players.slice(4, 6).map(renderPlayer)}
      </div>

      {/* BOTTOM */}
      <div className="players bottom">
        {players.slice(6, 8).map(renderPlayer)}
      </div>
    </div>
  );
}
