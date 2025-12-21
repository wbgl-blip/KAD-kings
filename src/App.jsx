{/* HUD */}
<div className="hud">
  <div className="hud-deck" onClick={drawCard}>
    <div className="deck-body">
      <span className="deck-label">DRAW CARD</span>
    </div>

    <div className="deck-face">
      {card ? <span>{card}</span> : <span>—</span>}
    </div>
  </div>

  <div className="hud-row">
    <div className="hud-item">
      <span className="hud-title">Progress</span>
      <span className="hud-value">{index} / 52</span>
    </div>

    <div className="hud-item">
      <span className="hud-title">Thumbmaster (J)</span>
      <span className="hud-value">None</span>
    </div>

    <div className="hud-item">
      <span className="hud-title">Heaven (7)</span>
      <span className="hud-value">None</span>
    </div>
  </div>

  <div className="hud-actions">
    <button>START J</button>
    <button>START 7</button>
    <button className="secondary">RESET</button>
  </div>
</div>
