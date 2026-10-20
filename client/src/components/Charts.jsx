import { useEffect, useRef, useState } from 'react';

// Gráficos do painel (SVG/HTML puro, sem biblioteca). Painel é sempre escuro (cards #111).
// Cores validadas contra a superfície #111111: azul da série, cinza de contexto (>= 3:1),
// rampa de 5 tons para o mapa de calor e a paleta fixa de status.
export const CHART = {
  blue: '#3987e5',
  blueHover: '#5598e7',
  gray: '#62615d',
  grid: '#1E1E1E',
  axis: '#2a2a2a',
  textMuted: '#777',
  heat: ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'],
  heatEmpty: '#171717',
  status: { completed: '#0ca30c', no_show: '#fab219', cancelled: '#d03b3b', pending: '#62615d' },
};

// Largura do container, para o SVG desenhar no tamanho real (texto nunca distorce)
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Escala "redonda" para o eixo: 0 · metade · topo
function niceMax(v) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v / 1) * pow;
  return step;
}

// Coluna com topo arredondado (4px) e base reta
function colPath(x, y, w, h, r = 4) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 shadow-xl whitespace-nowrap"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <p className="text-white text-sm font-semibold">{tip.value}</p>
      <p className="text-[#888] text-xs">{tip.label}</p>
    </div>
  );
}

// Colunas verticais de uma série. `highlight`: destaca uma coluna (resto em cinza).
// `labelKeys`: colunas que mostram o valor no topo (rótulos seletivos, nunca todos).
export function ColumnChart({ data, height = 190, highlight, labelKeys = [], format = (v) => v, ariaLabel }) {
  const [ref, width] = useWidth();
  const [tip, setTip] = useState(null);
  const padL = 64, padR = 8, padT = 22, padB = 24;
  const plotW = Math.max(0, width - padL - padR);
  const plotH = height - padT - padB;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, band * 0.62));
  const yOf = (v) => padT + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];

  return (
    <div ref={ref} className="relative" onPointerLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={width - padR} y1={yOf(t)} y2={yOf(t)} stroke={t === 0 ? CHART.axis : CHART.grid} strokeWidth="1" />
              <text x={padL - 8} y={yOf(t)} dy="0.32em" textAnchor="end" fontSize="11" fill={CHART.textMuted} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + band * i + band / 2;
            const h = (d.value / max) * plotH;
            const hovered = tip?.key === d.key;
            const fill = highlight && d.key !== highlight ? CHART.gray : hovered ? CHART.blueHover : CHART.blue;
            const show = () => setTip({ key: d.key, x: cx, y: yOf(d.value), value: d.tipValue ?? format(d.value), label: d.tipLabel ?? d.label });
            return (
              <g key={d.key}>
                {h > 0 && <path d={colPath(cx - barW / 2, yOf(d.value), barW, h)} fill={fill} />}
                {labelKeys.includes(d.key) && d.value > 0 && (
                  <text x={cx} y={yOf(d.value) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="#ddd">{format(d.value)}</text>
                )}
                {d.axisLabel && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="11" fill={CHART.textMuted}>{d.axisLabel}</text>
                )}
                {/* Área de toque = a faixa inteira, maior que a coluna */}
                <rect
                  x={padL + band * i} y={padT} width={band} height={plotH} fill="transparent"
                  tabIndex={0} aria-label={`${d.tipLabel ?? d.label}: ${d.tipValue ?? format(d.value)}`}
                  onPointerEnter={show} onClick={show} onFocus={show} onBlur={() => setTip(null)}
                  style={{ outline: 'none', cursor: 'pointer' }}
                />
              </g>
            );
          })}
        </svg>
      )}
      <Tooltip tip={tip} />
    </div>
  );
}

// Barras horizontais com nome acima e valor na ponta (cabe bem no celular)
export function BarList({ data, format = (v) => v, sub }) {
  const max = Math.max(...data.map((d) => d.value), 0) || 1;
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.key}>
          <p className="text-[#bbb] text-sm truncate">{d.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-3 rounded-r" style={{ width: `${Math.max(2, (d.value / max) * 72)}%`, background: CHART.blue }} />
            <span className="text-white text-xs font-semibold shrink-0">{format(d.value)}</span>
            {sub && <span className="text-[#666] text-xs shrink-0">{sub(d)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_ITEMS = [
  { key: 'completed', label: 'Concluídos',     icon: '✓' },
  { key: 'no_show',   label: 'Faltaram',       icon: '!' },
  { key: 'cancelled', label: 'Cancelados',     icon: '×' },
  { key: 'pending',   label: 'Sem marcar',     icon: '•' },
];

// Barra empilhada 100% do comparecimento + legenda com ícone, quantidade e %
export function StatusBar({ counts }) {
  const [tip, setTip] = useState(null);
  const total = STATUS_ITEMS.reduce((s, it) => s + (counts[it.key] || 0), 0);
  const items = STATUS_ITEMS.filter((it) => counts[it.key] > 0);
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
  if (!total) return <p className="text-[#555] text-sm">Nenhum atendimento até hoje neste mês.</p>;
  return (
    <div>
      <div className="relative" onPointerLeave={() => setTip(null)}>
        <div className="flex gap-[2px] h-5 rounded overflow-hidden">
          {items.map((it) => {
            const show = (e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const parent = e.currentTarget.parentElement.getBoundingClientRect();
              setTip({ x: box.left - parent.left + box.width / 2, y: 0, value: `${counts[it.key]} · ${pct(counts[it.key])}%`, label: it.label });
            };
            return (
              <div
                key={it.key} tabIndex={0} aria-label={`${it.label}: ${counts[it.key]}`}
                onPointerEnter={show} onClick={show} onFocus={show} onBlur={() => setTip(null)}
                className="h-full cursor-pointer outline-none hover:brightness-125"
                style={{ flexGrow: counts[it.key], flexBasis: 0, background: CHART.status[it.key] }}
              />
            );
          })}
        </div>
        <Tooltip tip={tip} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
        {STATUS_ITEMS.map((it) => (
          <div key={it.key} className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold text-black shrink-0" style={{ background: CHART.status[it.key] }}>{it.icon}</span>
            <span className="text-[#999]">{it.label}</span>
            <span className="text-white font-semibold ml-auto">{counts[it.key] || 0}</span>
            <span className="text-[#555] text-xs w-9 text-right">{pct(counts[it.key] || 0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Mapa de calor: colunas = dias da semana, linhas = horários. 5 tons de azul por quantidade.
export function Heatmap({ days, hours, cells }) {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const max = Math.max(0, ...Object.values(cells));
  const colorOf = (n) => (n ? CHART.heat[Math.min(4, Math.ceil((n / max) * 5) - 1)] : CHART.heatEmpty);
  const cols = { gridTemplateColumns: `36px repeat(${days.length}, minmax(0, 1fr))` };
  return (
    <div>
      <div ref={ref} className="relative" onPointerLeave={() => setTip(null)}>
        <div className="grid gap-[2px]" style={cols}>
          <div />
          {days.map((d) => <p key={d} className="text-center text-[11px] text-[#777] pb-1">{DOW[d]}</p>)}
          {hours.map((h) => [
            <p key={`h${h}`} className="text-[11px] text-[#777] text-right pr-2 leading-[20px]" style={{ fontVariantNumeric: 'tabular-nums' }}>{String(h).padStart(2, '0')}h</p>,
            ...days.map((d) => {
              const n = cells[`${d}-${h}`] || 0;
              const show = (e) => {
                const box = e.currentTarget.getBoundingClientRect();
                const parent = ref.current.getBoundingClientRect();
                setTip({ x: box.left - parent.left + box.width / 2, y: box.top - parent.top, value: `${n} agendamento${n !== 1 ? 's' : ''}`, label: `${DOW[d]} · ${String(h).padStart(2, '0')}h` });
              };
              return (
                <div
                  key={`${d}-${h}`} tabIndex={0} aria-label={`${DOW[d]} ${h}h: ${n}`}
                  onPointerEnter={show} onClick={show} onFocus={show} onBlur={() => setTip(null)}
                  className="h-5 rounded-[3px] cursor-pointer outline-none hover:ring-1 hover:ring-white/40"
                  style={{ background: colorOf(n) }}
                />
              );
            }),
          ])}
        </div>
        <Tooltip tip={tip} />
      </div>
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[11px] text-[#777] mr-1">menos</span>
        {[CHART.heatEmpty, ...CHART.heat].map((c) => <span key={c} className="w-3.5 h-3.5 rounded-[3px]" style={{ background: c }} />)}
        <span className="text-[11px] text-[#777] ml-1">mais</span>
      </div>
    </div>
  );
}

// Versão em tabela de um gráfico (o valor nunca depende só do hover)
export function DataTable({ columns, rows }) {
  return (
    <details className="mt-4 group">
      <summary className="text-[#555] hover:text-[#888] text-xs cursor-pointer select-none list-none">
        <span className="group-open:hidden">Ver dados em tabela</span><span className="hidden group-open:inline">Ocultar tabela</span>
      </summary>
      <div className="mt-2 max-h-60 overflow-y-auto border border-[#1a1a1a] rounded-lg">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#141414]">
            <tr>{columns.map((c) => <th key={c} className="text-left text-[#666] font-medium px-3 py-2">{c}</th>)}</tr>
          </thead>
          <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#161616]">
                {r.map((cell, j) => <td key={j} className={`px-3 py-1.5 ${j === 0 ? 'text-[#aaa]' : 'text-white'}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
