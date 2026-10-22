"use client";

import { useState } from "react";
import { useData } from "./DataProvider";

/** Vlam met verloop geel → oranje → rood */
function Flame({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e1242f" />
          <stop offset=".55" stopColor="#ff7a1a" />
          <stop offset="1" stopColor="#ffd34d" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12.4 1.6c.6 3.2-1 5.1-2.6 6.9C8.2 10.2 6.6 12 6.6 15a5.4 5.4 0 0 0 10.8.3c0-1.9-.8-3.3-1.7-4.4.1 1.3-.3 2.4-1.2 3 .3-3.6-.8-6.7-2.1-9.1-.2 2.4-1.2 3.6-2.3 4.6.5-2.9 1.5-5.1 2.3-7.8Z"
      />
      <path fill="#fff3c4" opacity=".85" d="M12 13.2c-.9 1-1.6 1.8-1.6 3a1.8 1.8 0 0 0 3.6.1c0-1.2-.9-2-2-3.1Z" />
    </svg>
  );
}

/** Keeperhandschoen met een vlammetje erboven */
function Glove({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#e1242f" />
          <stop offset="1" stopColor="#ffb02e" />
        </linearGradient>
      </defs>
      <path fill={`url(#${id})`} d="M17.6 1.2c.3 1.6-.5 2.5-1.2 3.3-.7.8-1.4 1.6-1.4 2.9a2.5 2.5 0 0 0 5 .1c0-.9-.4-1.5-.8-2 0 .6-.2 1.1-.6 1.4.1-1.7-.4-3.1-1-4.2Z" />
      <path
        fill="#f4f1f1"
        d="M6.2 8.3c.6 0 1 .4 1 1v3.2h.5V6.6a1 1 0 0 1 2 0v5.9h.5V5.8a1 1 0 0 1 2 0v6.7h.5V7a1 1 0 0 1 2 0v7.4l.9-1.4a1.2 1.2 0 0 1 2 1.2l-2.6 4.6a5 5 0 0 1-4.3 2.5h-.8A4.9 4.9 0 0 1 5.2 16.4V9.3c0-.6.4-1 1-1Z"
      />
      <rect x="6.6" y="19.6" width="8" height="2.6" rx=".6" fill="#e1242f" />
    </svg>
  );
}

/** Icoon(en) achter een spelersnaam als hij "on fire" is; tik voor de reden */
export function OnFire({ playerId }: { playerId: string }) {
  const { view } = useData();
  const [open, setOpen] = useState(false);
  const streaks = view.streaks[playerId];
  if (!streaks?.length) return null;
  const reason = streaks.map((s) => s.reason).join(" · ");

  return (
    <span className="onfire">
      <button
        type="button"
        className="onfire-btn"
        aria-label={`On fire: ${reason}`}
        title={reason}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        {streaks.map((s) =>
          s.kind === "keeper" ? <Glove key="k" id={`glove-${playerId}`} /> : <Flame key="s" id={`flame-${playerId}`} />,
        )}
      </button>
      {open && <span className="onfire-pop">{reason}</span>}
    </span>
  );
}
