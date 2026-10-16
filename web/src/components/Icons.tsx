/** The few drawn icons Conjure uses (REFERENCE.md: draw the icon or drop it, never emoji). */
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconUpload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </svg>
);

export const IconClose = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconDownload = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...base}>
    <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />
  </svg>
);
