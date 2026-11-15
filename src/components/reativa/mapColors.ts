const v = (n: string) => (typeof window === "undefined" ? "#888" : getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888");
export const mc = {
  paper: () => v("--paper"), risk: (n: number) => v(`--risk-${n}`), hand: (n: number) => v(`--hand-${n}`),
  red: () => v("--signal-red"), blue: () => v("--ops-blue"), navy: () => v("--navy-900"), orange: () => v("--sev-severo"),
  yellow: () => v("--sev-moderado"), grey: () => v("--sev-menor"), green: () => v("--success"), slate: () => v("--slate-600"),
};
