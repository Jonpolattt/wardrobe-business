export type FlagCode = "uz" | "ru" | "us" | "cn";

function starPoints(cx: number, cy: number, r: number, rotation = 0) {
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? r : r * 0.382;
    const angle = rotation + (Math.PI / 5) * i - Math.PI / 2;
    return (cx + radius * Math.cos(angle)).toFixed(2) + "," + (cy + radius * Math.sin(angle)).toFixed(2);
  }).join(" ");
}

export function Flag({ code }: { code: FlagCode }) {
  const stripe = 20 / 13;
  return (
    <span className="flag" aria-hidden="true">
      <svg viewBox="0 0 30 20" preserveAspectRatio="none">
        {code === "ru" && (
          <>
            <rect width="30" height="20" fill="#ffffff" />
            <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
            <rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
          </>
        )}
        {code === "uz" && (
          <>
            <rect width="30" height="20" fill="#ffffff" />
            <rect width="30" height="6.4" fill="#0099b5" />
            <rect y="13.6" width="30" height="6.4" fill="#1eb53a" />
            <rect y="6.4" width="30" height="0.6" fill="#ce1126" />
            <rect y="13" width="30" height="0.6" fill="#ce1126" />
            <circle cx="4.6" cy="3.2" r="2.1" fill="#ffffff" />
            <circle cx="5.4" cy="3.2" r="1.8" fill="#0099b5" />
            {[
              [9, 5],
              [11, 5],
              [13, 5],
              [9.9, 3.2],
              [11.9, 3.2],
              [13.9, 3.2],
              [10.8, 1.4],
              [12.8, 1.4],
            ].map(([x, y]) => (
              <circle key={x + "-" + y} cx={x} cy={y} r="0.42" fill="#ffffff" />
            ))}
          </>
        )}
        {code === "us" && (
          <>
            <rect width="30" height="20" fill="#ffffff" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} y={i * 2 * stripe} width="30" height={stripe} fill="#b22234" />
            ))}
            <rect width="13" height={stripe * 7} fill="#3c3b6e" />
            {Array.from({ length: 12 }, (_, i) => (
              <circle
                key={i}
                cx={1.8 + (i % 4) * 3.1}
                cy={1.8 + Math.floor(i / 4) * 3.4}
                r="0.5"
                fill="#ffffff"
              />
            ))}
          </>
        )}
        {code === "cn" && (
          <>
            <rect width="30" height="20" fill="#de2910" />
            <polygon points={starPoints(5, 5, 3)} fill="#ffde00" />
            {[
              [10, 2],
              [12, 4],
              [12, 7],
              [10, 9],
            ].map(([x, y]) => (
              <polygon key={x + "-" + y} points={starPoints(x, y, 1)} fill="#ffde00" />
            ))}
          </>
        )}
      </svg>
    </span>
  );
}

/* ---------- Dropdown (language / currency) ---------- */
