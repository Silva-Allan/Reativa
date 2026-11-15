export function ThermalFrame({ boxes = true }: { boxes?: boolean }) {
  return <svg viewBox="0 0 640 380" role="img" aria-label="Imagem térmica sintética CBM-D01: dois pontos de calor no telhado da Rua Sete" className="thermal-frame w-full rounded-md">
    <defs><linearGradient id="thermal-scale"><stop stopColor="var(--thermal-cold)" /><stop offset=".5" stopColor="var(--thermal-mid)" /><stop offset="1" stopColor="var(--thermal-hot)" /></linearGradient><radialGradient id="thermal-scene"><stop stopColor="var(--thermal-mid)" /><stop offset="1" stopColor="var(--thermal-cold)" /></radialGradient></defs>
    <rect width="640" height="380" fill="url(#thermal-scene)" />
    <path d="M0 200 Q170 150 320 250 T640 210 V380 H0Z" className="thermal-water" />
    <g className="thermal-roof"><path d="M70 70H200V160H70Z M250 100H470V240H250Z M500 35H590V135H500Z M35 265H160V345H35Z" /><path d="M250 100L360 55L470 100 M250 170H470" /></g>
    <ellipse cx="318" cy="147" rx="12" ry="17" className="thermal-hotspot" /><ellipse cx="408" cy="197" rx="30" ry="13" className="thermal-hotspot" />
    {boxes && <g className="thermal-box"><rect x="289" y="115" width="58" height="67" /><rect x="371" y="170" width="78" height="56" /></g>}
    <g fill="var(--paper)" fontSize="13"><text x="12" y="22">CBM-D01 · Rua Sete · 15:22 · imagem sintética</text><text x="289" y="108">01 · 0,86</text><text x="371" y="163">02 · 0,41</text></g>
    <rect x="460" y="350" width="160" height="12" fill="url(#thermal-scale)" />
  </svg>;
}