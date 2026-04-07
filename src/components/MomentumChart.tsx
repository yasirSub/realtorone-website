import React, { useMemo, useId } from 'react';

export type MomentumPoint = {
    label: string;
    sublabel?: string;
    conscious: number;
    subco: number;
};

type Props = {
    data: MomentumPoint[];
    yMax: number;
    variant: 'bars' | 'lines';
};

const CON = { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.18)' };
const ID = { stroke: '#f472b6', fill: 'rgba(244, 114, 182, 0.15)' };

/** Smooth cubic path through points (Catmull-Rom style via cubic beziers). */
function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    const p = points;
    let d = `M ${p[0].x} ${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
        const p0 = p[Math.max(0, i - 1)];
        const p1 = p[i];
        const p2 = p[i + 1];
        const p3 = p[Math.min(p.length - 1, i + 2)];
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
    }
    return d;
}

function areaUnderPoints(linePath: string, pts: { x: number; y: number }[], bottomY: number): string {
    if (!linePath || pts.length === 0) return '';
    const a = pts[0];
    const b = pts[pts.length - 1];
    return `${linePath} L ${b.x} ${bottomY} L ${a.x} ${bottomY} Z`;
}

export const MomentumChart: React.FC<Props> = ({ data, yMax, variant }) => {
    const uid = useId();
    const gradCon = `${uid}-g-con`;
    const gradId = `${uid}-g-id`;

    const svgModel = useMemo(() => {
        const W = 1000;
        const H = 318;
        /** Extra right/bottom padding so “WEEK N” / month labels are not clipped. */
        const pad = { l: 48, r: 52, t: 18, b: 78 };
        const plotW = W - pad.l - pad.r;
        const plotH = H - pad.t - pad.b;
        const bottomY = pad.t + plotH;
        const n = data.length;
        const cap = Math.max(yMax, 1);

        const xAt = (i: number) =>
            pad.l + (n <= 1 ? plotW / 2 : (i / Math.max(1, n - 1)) * plotW);
        const yAt = (v: number) => pad.t + (1 - Math.min(Math.max(v, 0), cap) / cap) * plotH;

        const ptsCon = data.map((d, i) => ({ x: xAt(i), y: yAt(d.conscious) }));
        const ptsId = data.map((d, i) => ({ x: xAt(i), y: yAt(d.subco) }));
        const pathCon = smoothPath(ptsCon);
        const pathId = smoothPath(ptsId);
        const areaCon = pathCon ? areaUnderPoints(pathCon, ptsCon, bottomY) : '';
        const areaId = pathId ? areaUnderPoints(pathId, ptsId, bottomY) : '';

        const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
            y: pad.t + (1 - t) * plotH,
            lab: Math.round(cap * t),
        }));

        return {
            W,
            H,
            pad,
            plotW,
            plotH,
            bottomY,
            pathCon,
            pathId,
            areaCon,
            areaId,
            ptsCon,
            ptsId,
            ticks,
            xAt,
        };
    }, [data, yMax]);

    if (data.length === 0) return null;

    if (variant === 'lines') {
        const m = svgModel;
        return (
            <div style={{ width: '100%', position: 'relative' }}>
                <svg
                    viewBox={`0 0 ${m.W} ${m.H}`}
                    preserveAspectRatio="xMidYMid meet"
                    style={{
                        width: '100%',
                        height: 'auto',
                        aspectRatio: `${m.W} / ${m.H}`,
                        display: 'block',
                    }}
                    role="img"
                    aria-label="Conscious and identity momentum over time"
                >
                    <defs>
                        <linearGradient id={gradCon} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CON.stroke} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={CON.stroke} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={ID.stroke} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={ID.stroke} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    {m.ticks.map((tk, i) => (
                        <g key={i}>
                            <line
                                x1={m.pad.l}
                                x2={m.W - m.pad.r}
                                y1={tk.y}
                                y2={tk.y}
                                stroke="rgba(148, 163, 184, 0.2)"
                                strokeWidth={1}
                            />
                            <text
                                x={m.pad.l - 6}
                                y={tk.y + 4}
                                textAnchor="end"
                                fill="var(--text-muted)"
                                fontSize={12}
                                fontWeight={600}
                                style={{ fontFamily: 'inherit' }}
                            >
                                {tk.lab}
                            </text>
                        </g>
                    ))}

                    {m.areaCon ? (
                        <path d={m.areaCon} fill={`url(#${gradCon})`} stroke="none" />
                    ) : null}
                    {m.areaId ? <path d={m.areaId} fill={`url(#${gradId})`} stroke="none" /> : null}

                    <path
                        d={m.pathCon}
                        fill="none"
                        stroke={CON.stroke}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="drop-shadow(0 2px 8px rgba(126, 34, 206, 0.35))"
                    />
                    <path
                        d={m.pathId}
                        fill="none"
                        stroke={ID.stroke}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter="drop-shadow(0 2px 8px rgba(217, 70, 239, 0.35))"
                    />

                    {m.ptsCon.map((pt, i) => (
                        <circle key={`c-${i}`} cx={pt.x} cy={pt.y} r={5} fill="var(--bg-card, #0f172a)" stroke={CON.stroke} strokeWidth={2}>
                            <title>{`Conscious ${Math.round(data[i].conscious)}%`}</title>
                        </circle>
                    ))}
                    {m.ptsId.map((pt, i) => (
                        <circle key={`i-${i}`} cx={pt.x} cy={pt.y} r={5} fill="var(--bg-card, #0f172a)" stroke={ID.stroke} strokeWidth={2}>
                            <title>{`Identity ${Math.round(data[i].subco)}%`}</title>
                        </circle>
                    ))}

                    {data.map((d, i) => {
                        const x = m.xAt(i);
                        return (
                            <text
                                key={`lx-${i}`}
                                x={x}
                                y={m.H - 44}
                                textAnchor="middle"
                                fill="var(--text-main)"
                                fontSize={13}
                                fontWeight={700}
                                style={{ fontFamily: 'inherit' }}
                            >
                                {d.label}
                            </text>
                        );
                    })}
                    {data.map((d, i) => {
                        if (!d.sublabel) return null;
                        const x = m.xAt(i);
                        return (
                            <text
                                key={`ls-${i}`}
                                x={x}
                                y={m.H - 26}
                                textAnchor="middle"
                                fill="var(--text-muted)"
                                fontSize={10.5}
                                fontWeight={600}
                                style={{ fontFamily: 'inherit' }}
                            >
                                {d.sublabel}
                            </text>
                        );
                    })}
                </svg>
            </div>
        );
    }

    /* —— Grouped bars (rounded tops, grid) —— */
    const chartYMax = yMax;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '12px', alignItems: 'stretch' }}>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    paddingBottom: '44px',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                }}
            >
                {[
                    chartYMax,
                    Math.round(chartYMax * 0.75),
                    Math.round(chartYMax * 0.5),
                    Math.round(chartYMax * 0.25),
                    0,
                ].map((v, i) => (
                    <span key={i}>{v}</span>
                ))}
            </div>
            <div style={{ position: 'relative', minHeight: '240px' }}>
                <div style={{ position: 'absolute', inset: 0, bottom: '44px', pointerEvents: 'none' }}>
                    {[25, 50, 75].map((pct) => (
                        <div
                            key={pct}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: `${pct}%`,
                                height: 1,
                                background: 'rgba(148, 163, 184, 0.18)',
                            }}
                        />
                    ))}
                </div>
                <div
                    style={{
                        display: 'flex',
                        height: '196px',
                        alignItems: 'flex-end',
                        justifyContent: 'space-around',
                        gap: '10px',
                        padding: '0 8px',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {data.map((d, i) => {
                        const con = Number(d.conscious ?? 0);
                        const sub = Number(d.subco ?? 0);
                        const hCon = chartYMax > 0 ? Math.max(con > 0 ? 8 : 0, (con / chartYMax) * 188) : 0;
                        const hSub = chartYMax > 0 ? Math.max(sub > 0 ? 8 : 0, (sub / chartYMax) * 188) : 0;
                        return (
                            <div
                                key={i}
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    maxWidth: '140px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: '8px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'flex-end',
                                        justifyContent: 'center',
                                        height: '188px',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px',
                                            height: '100%',
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#c4b5fd' }}>
                                            {Math.round(con)}
                                        </span>
                                        <div
                                            title={`Conscious ${con}%`}
                                            style={{
                                                width: 'clamp(14px, 28%, 22px)',
                                                height: `${hCon}px`,
                                                minHeight: con > 0 ? 8 : 0,
                                                background: 'linear-gradient(180deg, #a855f7 0%, #6d28d9 100%)',
                                                borderRadius: '10px 10px 4px 4px',
                                                transition: 'height 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 6px 18px rgba(126, 34, 206, 0.4)',
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px',
                                            height: '100%',
                                            justifyContent: 'flex-end',
                                        }}
                                    >
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#f0abfc' }}>
                                            {Math.round(sub)}
                                        </span>
                                        <div
                                            title={`Identity ${sub}%`}
                                            style={{
                                                width: 'clamp(14px, 28%, 22px)',
                                                height: `${hSub}px`,
                                                minHeight: sub > 0 ? 8 : 0,
                                                background: 'linear-gradient(180deg, #f472b6 0%, #c026d3 100%)',
                                                borderRadius: '10px 10px 4px 4px',
                                                transition: 'height 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 6px 18px rgba(217, 70, 239, 0.38)',
                                            }}
                                        />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--text-main)' }}>{d.label}</div>
                                    {d.sublabel ? (
                                        <div
                                            style={{
                                                fontSize: '0.58rem',
                                                fontWeight: 700,
                                                color: 'var(--text-muted)',
                                                marginTop: '3px',
                                            }}
                                        >
                                            {d.sublabel}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
