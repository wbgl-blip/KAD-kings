export default function KingsBoard({ players }) {
  return (
    <div className="board">

      {/* TITLE */}
      <h1 className="title">KAD Kings</h1>

      {/* TOP PLAYERS */}
      <div className="players top">
        {players.slice(0, 2).map(renderPlayer)}
      </div>

      {/* LEFT PLAYERS */}
      <div className="players left">
        {players.slice(2, 4).map(renderPlayer)}
      </div>

      {/* CENTER CARD AREA */}
      <div className="center">
        <div className="card">
          <h2>Draw a card</h2>
          <p>No mercy</p>
        </div>

        <button className="draw-btn">DRAW CARD</button>
        <p className="cards-left">Cards Left: 52 / 52</p>
      </div>

      {/* RIGHT PLAYERS */}
      <div className="players right">
        {players.slice(4, 6).map(renderPlayer)}
      </div>

      {/* BOTTOM PLAYERS */}
      <div className="players bottom">
        {players.slice(6, 8).map(renderPlayer)}
      </div>

    </div>
  );
}

function renderPlayer(player) {
  return (
    <div className="player-card">
      <div className="avatar" />
      <div className="name">{player.name}</div>
      <div className="beers">🍺 {player.beers}</div>
      <button>+1 Beer</button>
    </div>
  );
}
