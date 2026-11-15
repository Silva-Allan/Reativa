/**
 * Synthetic nadir thermal frame (no real imagery). Palette goes cold → hot:
 * water (coldest) < ground < roofs < warm rooftop object < people (brightest).
 * Detection 01 = four people ON the Rua Sete roof; 02 = sun-heated water tank (false positive).
 */
export function ThermalFrame({ boxes = true, focus }: { boxes?: boolean; focus?: string | undefined }) {
  const people: [number, number][] = [[318, 146], [334, 158], [351, 147], [327, 175]];
  const ticks = [37, 30, 22, 15, 8];
  return <svg viewBox="0 0 720 380" role="img" aria-label="Imagem térmica sintética CBM-D01: quatro pontos de calor humanos sobre o telhado da Rua Sete e uma caixa d'água aquecida no telhado vizinho" className="thermal-frame w-full rounded-md">
    <defs>
      <linearGradient id="thermal-scale" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="var(--thermal-water)" /><stop offset=".3" stopColor="var(--thermal-roof)" /><stop offset=".55" stopColor="var(--thermal-mid)" />
        <stop offset=".75" stopColor="var(--thermal-warm)" /><stop offset=".9" stopColor="var(--thermal-hot)" /><stop offset="1" stopColor="var(--thermal-white)" />
      </linearGradient>
      <radialGradient id="thermal-body"><stop offset="0" stopColor="var(--thermal-white)" /><stop offset=".45" stopColor="var(--thermal-hot)" /><stop offset="1" stopColor="var(--thermal-warm)" stopOpacity="0" /></radialGradient>
      <radialGradient id="thermal-tank"><stop offset="0" stopColor="var(--thermal-hot)" /><stop offset=".6" stopColor="var(--thermal-warm)" /><stop offset="1" stopColor="var(--thermal-mid)" /></radialGradient>
    </defs>
    {/* Ground (cool) and flood water (coldest) */}
    <rect width="640" height="380" className="thermal-ground" />
    <path d="M0 215 Q160 175 300 262 T640 230 V380 H0Z M0 0 H640 V24 Q470 14 330 30 T0 22Z M205 0 H245 V380 H205Z M470 150 H500 V380 H470Z" className="thermal-water" />
    {/* Roofs seen from above, slightly warmer than water; ridge lines a touch warmer */}
    <g className="thermal-roof">
      <rect x="70" y="62" width="120" height="96" /><rect x="260" y="100" width="200" height="140" /><rect x="510" y="40" width="96" height="96" /><rect x="40" y="268" width="120" height="78" /><rect x="530" y="270" width="90" height="70" />
    </g>
    <g className="thermal-ridge"><path d="M70 110H190 M260 170H460 M558 40V136 M40 307H160 M530 305H620" /></g>
    {/* False positive: sun-heated water tank on the neighbouring roof */}
    <rect x="535" y="76" width="22" height="22" rx="3" fill="url(#thermal-tank)" />
    {/* People: small bright blobs on the roof surface */}
    {people.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="9" fill="url(#thermal-body)" />)}
    {boxes && <g className="thermal-box">
      <rect x="302" y="130" width="66" height="62" className={focus === "hot1" ? "thermal-box-focus" : undefined} />
      <rect x="527" y="68" width="38" height="38" className={focus === "hot2" ? "thermal-box-focus" : undefined} />
    </g>}
    <g className="thermal-text" fontSize="12">
      <text x="12" y="20">CBM-D01 · Rua Sete · 15:22 · imagem sintética</text>
      {boxes && <><text x="302" y="124">01 · pessoa? 0,86</text><text x="484" y="62">02 · caixa d'água 0,41</text></>}
    </g>
    {/* Vertical temperature scale */}
    <rect x="662" y="40" width="14" height="300" rx="2" fill="url(#thermal-scale)" />
    <g className="thermal-text" fontSize="11">
      {ticks.map((t, i) => <text key={t} x="682" y={44 + i * 75}>{t} °C</text>)}
    </g>
  </svg>;
}
