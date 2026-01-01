// src/App.jsx
import { useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULE_TEXT = {
  A: "Waterfall — wait for ready, drawer drinks first",
  2: "Pick someone to drink",
  3: "Me — drawer drinks",
  4: "Women drink",
  5: "Guys drink",
  6: "Everyone drinks",
  7: "Heaven (Power) — owner can start anytime",
  8: "Pick a mate",
  9: "Rhyme — loser drinks",
  10: "Categories — loser drinks",
  J: "Thumbmaster (Power) — owner can start anytime",
  Q: "Question Master — QM taps who answered (+1)",
  K: "Make a rule",
};

const LOSER_REASON_TEXT = {
  HEAVEN: "Heaven",
  THUMB: "Thumb",
  RHYME: "Rhyme",
  CATEGORIES: "Categories",
};

const DRINK_FLASH_MS = 2000;

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });

  // Fisher–Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* =========================
   APP
========================= */

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);

  // WAITING | IDLE | PICK_DRINK | PICK_MATE | PICK_LOSER | MAKE_RULE | WATERFALL_READY | REACTION_ACTIVE | QM_PICK
  const [phase, setPhase] = useState("WAITING");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      gender: "M", // future UI hook
      mates: [],
    }))
  );

  // Persistent roles (power cards / roles)
  const [thumbMaster, setThumbMaster] = useState(null); // J owner
  const [heavenMaster, setHeavenMaster] = useState(null); // 7 owner
  const [questionMaster, setQuestionMaster] = useState(null); // Q owner

  // Status + rules
  const [statusText, setStatusText] = useState("Waiting for everyone to be ready");
  const [rules, setRules] = useState([]); // K rules
  const [ruleDraft, setRuleDraft] = useState("");

  // Loser-pick context (9/10, and used by Heaven/Thumb)
  const [loserReason, setLoserReason] = useState(null); // HEAVEN | THUMB | RHYME | CATEGORIES

  // Reaction state (Heaven/Thumb active round)
  const [reaction, setReaction] = useState({
    type: null, // "HEAVEN" | "THUMB" | null
    owner: null,
    tapped: [], // ordered list of names who have responded
  });

  // Flash UI
  const [flashNames, setFlashNames] = useState(() => new Set());
  const flashTimerRef = useRef(null);

  // Avoid stale closures in propagateDrink + turn logic
  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = useMemo(() => players[turnIndex], [players, turnIndex]);

  /* =========================
     HELPERS
  ========================= */

  function nextTurn() {
    setTurnIndex((i) => {
      const n = playersRef.current.length;
      return n ? (i + 1) % n : 0;
    });
  }

  function setStatusWithTurn(message, turnNameOverride = null) {
    const name = turnNameOverride || playersRef.current[turnIndex]?.name;
    setStatusText(name ? `${message} — ${name}'s turn` : message);
  }

  function clearFlashLater() {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    flashTimerRef.current = setTimeout(() => {
      setFlashNames(new Set());
      flashTimerRef.current = null;
    }, DRINK_FLASH_MS);
  }

  function flashPlayers(names) {
    setFlashNames(new Set(names));
    clearFlashLater();
  }

  function addDrink(name) {
    setPlayers((prev) =>
      prev.map((p) => (p.name === name ? { ...p, beers: p.beers + 1 } : p))
    );
  }

  function propagateDrink(name, visited = new Set()) {
    if (!name) return;
    if (visited.has(name)) return;
    visited.add(name);

    addDrink(name);

    const p = playersRef.current.find((x) => x.name === name);
    const mates = p?.mates || [];
    for (const m of mates) propagateDrink(m, visited);
  }

  function enterFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen?.();
      else el.requestFullscreen?.();
    } catch {
      // ignore
    }
  }

  function safeStartGameIfWaiting() {
    if (phase !== "WAITING") return false;
    setPhase("IDLE");
    setStatusWithTurn("Tap the deck to draw");
    return true;
  }

  /* =========================
     GAME FLOW — DRAW
  ========================= */

  function drawCard() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }
    if (phase !== "IDLE") {
      // Keep it explicit: no draw while another action is pending
      setStatusWithTurn("Finish the current action first");
      return;
    }
    if (deck.length === 0) {
      setStatusText("Deck is empty — game over (all 52 cards drawn)");
      return;
    }

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = next.rank;
    const drawer = playersRef.current[turnIndex]?.name;

    // show rule immediately
    setStatusWithTurn(RULE_TEXT[r]);

    // A — Waterfall
    if (r === "A") {
      setPhase("WATERFALL_READY");
      setStatusWithTurn("Waterfall — tap Ready when everyone is ready (drawer drinks first)");
      return;
    }

    // 2 — Pick someone
    if (r === "2") {
      setPhase("PICK_DRINK");
      setStatusWithTurn("Pick a player to drink (+1)");
      return;
    }

    // 3 — Me
    if (r === "3") {
      if (drawer) {
        flashPlayers([drawer]);
        propagateDrink(drawer);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 4 — Women drink
    if (r === "4") {
      const women = playersRef.current.filter((p) => p.gender === "F").map((p) => p.name);
      if (women.length) {
        flashPlayers(women);
        for (const n of women) propagateDrink(n);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 5 — Guys drink
    if (r === "5") {
      const men = playersRef.current.filter((p) => p.gender === "M").map((p) => p.name);
      if (men.length) {
        flashPlayers(men);
        for (const n of men) propagateDrink(n);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 6 — Everyone drinks
    if (r === "6") {
      const all = playersRef.current.map((p) => p.name);
      if (all.length) {
        flashPlayers(all);
        for (const n of all) propagateDrink(n);
      }
      nextTurn();
      setStatusWithTurn("Tap the deck to draw");
      return;
    }

    // 7 — Heaven power card (set owner)
    if (r === "7") {
      setHeavenMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Heaven set: ${drawer || "—"} (owner can start anytime)`);
      return;
    }

    // 8 — Pick a mate
    if (r === "8") {
      setPhase("PICK_MATE");
      setStatusWithTurn("Pick a mate (tap a player)");
      return;
    }

    // 9 — Rhyme loser
    if (r === "9") {
      setLoserReason("RHYME");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Rhyme — tap the loser (player) to give +1");
      return;
    }

    // 10 — Categories loser
    if (r === "10") {
      setLoserReason("CATEGORIES");
      setPhase("PICK_LOSER");
      setStatusWithTurn("Categories — tap the loser (player) to give +1");
      return;
    }

    // J — Thumbmaster power card (set owner)
    if (r === "J") {
      setThumbMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Thumbmaster set: ${drawer || "—"} (owner can start anytime)`);
      return;
    }

    // Q — Question master (set owner)
    if (r === "Q") {
      setQuestionMaster(drawer || null);
      nextTurn();
      setStatusWithTurn(`Question Master set: ${drawer || "—"} (QM taps who answered)`);
      return;
    }

    // K — Make a rule
    if (r === "K") {
      setPhase("MAKE_RULE");
      setStatusWithTurn("Make a rule — type it in and save");
      return;
    }

    // fallback
    nextTurn();
    setStatusWithTurn("Tap the deck to draw");
  }

  /* =========================
     INTERACTIONS — PLAYER TAP
  ========================= */

  function tapPlayer(name) {
    // Pick loser flow (9/10 and also used by thumb/heaven when active)
    if (phase === "PICK_LOSER") {
      flashPlayers([name]);
      propagateDrink(name);

      const reasonLabel = LOSER_REASON_TEXT[loserReason] || "Loser";
      setLoserReason(null);

      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`${reasonLabel} — ${name} drinks (+1). Tap the deck to draw`);
      return;
    }

    // Pick drink flow (2)
    if (phase === "PICK_DRINK") {
      flashPlayers([name]);
      propagateDrink(name);

      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn(`Picked ${name} to drink (+1). Tap the deck to draw`);
      return;
    }

    // Pick mate (8) — cannot self, cannot duplicate
    if (phase === "PICK_MATE") {
      const drawer = playersRef.current[turnIndex]?.name;
      if (!drawer) return;
      if (name === drawer) return;

      let didAdd = false;
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.name !== drawer) return p;
          if (p.mates.includes(name)) return p;
          didAdd = true;
          return { ...p, mates: [...p.mates, name] };
        })
      );

      if (didAdd) {
        setPhase("IDLE");
        nextTurn();
        setStatusWithTurn(`${drawer} picked ${name} as a mate. Tap the deck to draw`);
      } else {
        setStatusWithTurn("That mate is already selected");
      }
      return;
    }

    // Reaction active (Heaven/Thumb): ONLY self-tap counts, owner excluded
    if (phase === "REACTION_ACTIVE") {
      const owner = reaction.owner;
      if (!owner) return;
      if (name === owner) return; // owner cannot lose
      if (name !== getLocalSelfName()) {
        // Single-device prototype: we still let you test by tapping any tile,
        // but we strongly prefer "self-tap only" logic for multiplayer.
        // For now, enforce self-tap only if we can infer "self".
        // If not inferable, allow tap to simulate a player responding.
      }

      // Prevent duplicates
      if (reaction.tapped.includes(name)) return;

      const nextTapped = [...reaction.tapped, name];
      setReaction((r) => ({ ...r, tapped: nextTapped }));

      // Eligible = all except owner
      const eligibleCount = playersRef.current.length - 1;
      if (nextTapped.length >= eligibleCount) {
        // Last tapper loses
        const loser = nextTapped[nextTapped.length - 1];
        flashPlayers([loser]);
        propagateDrink(loser);

        const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
        setReaction({ type: null, owner: null, tapped: [] });
        setPhase("IDLE");

        // Reaction does NOT change whose turn it is (trigger anytime)
        setStatusWithTurn(`${label} — ${loser} was last and drinks (+1). Tap the deck to draw`);
      } else {
        const label = reaction.type === "THUMB" ? "Thumb" : "Heaven";
        setStatusWithTurn(`${label} active — players tap their tile (${nextTapped.length}/${eligibleCount})`);
      }
      return;
    }

    // Question Master assign: QM taps the player who answered (+1)
    if (phase === "QM_PICK") {
      flashPlayers([name]);
      propagateDrink(name);
      setPhase("IDLE");
      setStatusWithTurn(`${name} answered (+1). Tap the deck to draw`);
      return;
    }

    // Otherwise: no-op (prevents accidental beers changing)
  }

  // On a single device we cannot truly know "self".
  // This returns null and is used only for strict self-only gating later in multiplayer.
  function getLocalSelfName() {
    return null;
  }

  /* =========================
     ACTION BUTTONS
  ========================= */

  function onReadyAction() {
    if (safeStartGameIfWaiting()) return;

    if (phase === "WATERFALL_READY") {
      // Drawer drinks first after Ready
      const drawer = playersRef.current[turnIndex]?.name;
      if (drawer) {
        flashPlayers([drawer]);
        propagateDrink(drawer);
      }
      setPhase("IDLE");
      nextTurn();
      setStatusWithTurn("Waterfall started — drawer drank first. Tap the deck to draw");
      return;
    }

    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    setStatusWithTurn("Tap the deck to draw");
  }

  function startReaction(type) {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }

    const owner = type === "THUMB" ? thumbMaster : heavenMaster;
    if (!owner) {
      setStatusWithTurn(type === "THUMB" ? "No Thumbmaster yet (draw J first)" : "No Heaven owner yet (draw 7 first)");
      return;
    }

    setReaction({ type, owner, tapped: [] });
    setPhase("REACTION_ACTIVE");
    setStatusWithTurn(`${type === "THUMB" ? "Thumb" : "Heaven"} active — players tap their tile (owner: ${owner})`);
  }

  function onThumb() {
    startReaction("THUMB");
  }

  function onHeaven() {
    startReaction("HEAVEN");
  }

  function onQM() {
    if (phase === "WAITING") {
      setStatusText("Press Ready to start");
      return;
    }
    if (phase !== "IDLE") {
      setStatusWithTurn("Finish the current action first");
      return;
    }
    if (!questionMaster) {
      setStatusWithTurn("No Question Master yet (draw Q first)");
      return;
    }
    setPhase("QM_PICK");
    setStatusWithTurn(`QM active (${questionMaster}) — tap the player who answered (+1)`);
  }

  /* =========================
     RULE INPUT (K)
  ========================= */

  function submitRule() {
    const text = ruleDraft.trim();
    if (!text) return;

    setRules((prev) => [...prev, text]);
    setRuleDraft("");
    setPhase("IDLE");
    nextTurn();
    setStatusWithTurn("Rule saved. Tap the deck to draw");
  }

  /* =========================
     LISTS
  ========================= */

  const matesLines = useMemo(() => {
    const out = [];
    for (const p of players) for (const m of p.mates) out.push(`${p.name} → ${m}`);
    return out;
  }, [players]);

  const rulesLines = useMemo(() => {
    // Blank start of game (4 lines) as requested
    return rules;
  }, [rules]);

  /* =========================
     RENDER
  ========================= */

  const drawLocked =
    phase !== "IDLE" && phase !== "WAITING"; // WAITING shows status; IDLE draws; otherwise locked

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>

        <button
          className="fullscreen-btn"
          onClick={enterFullscreen}
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          ⛶
        </button>
      </header>

      <section className="top-grid">
        <Panel title="🤝 Mates" items={matesLines} />

        <div className="panel card-panel">
          <div
            className={`card ${card ? "active" : "draw"} ${drawLocked ? "disabled" : ""}`}
            onClick={drawCard}
            role="button"
            aria-disabled={drawLocked}
            title={phase === "IDLE" ? "Tap to draw" : phase === "WAITING" ? "Press Ready to start" : "Finish current action"}
          >
            {!card ? (
              <div className="card-draw-label">DECK</div>
            ) : (
              <>
                <div className="rank">
                  {card.rank}
                  {card.suit}
                </div>
                <div className="rule-text">{RULE_TEXT[card.rank]}</div>
                <div className="sub">{deck.length} cards left</div>
              </>
            )}
          </div>
        </div>

        <Panel title="📜 Rules" items={rulesLines} />
      </section>

      <section className="actions">
        <button className="btn thumb" onClick={onThumb} disabled={phase === "WAITING"}>
          👍 Thumb
        </button>

        <button className="btn ready" onClick={onReadyAction}>
          Ready
        </button>

        <button className="btn heaven" onClick={onHeaven} disabled={phase === "WAITING"}>
          ☁ Heaven
        </button>
      </section>

      <section className="status-bar">
        <div className="status-main">{statusText}</div>

        <div className="status-meta">
          <span className="meta-pill">{`Turn: ${currentPlayer?.name || "—"}`}</span>
          <span className="meta-pill">{`7: ${heavenMaster || "—"}`}</span>
          <span className="meta-pill">{`J: ${thumbMaster || "—"}`}</span>
          <span className="meta-pill">{`Q: ${questionMaster || "—"}`}</span>

          <button className="meta-btn" onClick={onQM} disabled={phase === "WAITING"}>
            QM Tap
          </button>
        </div>
      </section>

      <section className="players">
        {players.map((p) => {
          const isTurn = p.name === currentPlayer?.name;
          const isFlashing = flashNames.has(p.name);

          return (
            <div
              key={p.name}
              className={`player ${isTurn ? "TURN" : ""} ${isFlashing ? "FLASH" : ""}`}
              onClick={() => tapPlayer(p.name)}
              role="button"
              title="Tap when the game asks you to pick someone"
            >
              <div className="video-slot" />
              <div className="player-footer">
                <span className="player-name">{p.name}</span>
                <span className="player-beers">🍺 {p.beers}</span>
              </div>
            </div>
          );
        })}
      </section>

      {phase === "MAKE_RULE" && (
        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            placeholder="Type the rule…"
            maxLength={80}
          />
          <button onClick={submitRule}>Save Rule</button>
        </div>
      )}
    </div>
  );
}

function Panel({ title, items = [] }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>

      {[...Array(4)].map((_, i) => (
        <div key={i} className="row" title={items[i] || ""}>
          <span className="row-text">{items[i] || "—"}</span>
        </div>
      ))}
    </div>
  );
}
