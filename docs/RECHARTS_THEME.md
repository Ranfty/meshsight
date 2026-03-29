# Recharts Theme for MeshSight

Reference for styling all Recharts charts to match the MeshSight dark theme. Every chart in MeshSight uses these patterns — do not deviate.

## Colour constants

Define these once and import everywhere charts are used. These map to the CSS custom properties defined in the design system.

```ts
// src/data/chartTheme.ts

export const CHART_COLORS = {
  // Semantic
  terrain: '#2a3142',         // --border, used for terrain fill
  terrainStroke: '#3a4458',   // slightly lighter for terrain outline
  los: '#8892a4',             // --muted-foreground, LOS line
  losEffective: '#e2e6ed',    // --foreground, effective LOS (adjusted for curvature)

  // Fresnel zone
  fresnelClear: '#3ecf8e',    // --primary (green), where Fresnel is clear
  fresnelBlocked: '#ef4444',  // --destructive (red), where Fresnel is obstructed
  fresnelZone: '#8b5cf6',     // --chart-5 (purple), Fresnel boundary

  // Signal strength
  signalExcellent: '#3ecf8e', // green
  signalGood: '#60a5fa',      // blue
  signalFair: '#f59e42',      // orange
  signalWeak: '#ef4444',      // red

  // Axes and grid
  grid: '#1c2230',            // --muted
  axis: '#8892a4',            // --muted-foreground
  axisLabel: '#8892a4',
  tooltipBg: '#151921',       // --card
  tooltipBorder: '#2a3142',   // --border
  tooltipText: '#e2e6ed',     // --foreground
} as const;

export const CHART_FONTS = {
  tick: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    fill: CHART_COLORS.axis,
  },
  label: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    fill: CHART_COLORS.axisLabel,
  },
  tooltip: {
    fontFamily: '"DM Sans", sans-serif',
    fontSize: 13,
  },
} as const;
```

## Elevation profile chart (link analysis)

This is the primary chart in MeshSight. It shows terrain, LOS line, Fresnel zone, and node positions.

```tsx
// src/components/map/ElevationProfileChart.tsx
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS, CHART_FONTS } from '@/data/chartTheme';

interface ProfileChartProps {
  profile: ElevationProfile;
  txHeightM: number;
  rxHeightM: number;
}

export default function ElevationProfileChart({ profile, txHeightM, rxHeightM }: ProfileChartProps) {
  // Transform profile data for Recharts
  const data = profile.points.map((p, i) => ({
    distance: p.distanceM / 1000,                       // km for x-axis
    terrain: p.elevationM,
    losLine: calculateLOSHeight(i, profile, txHeightM, rxHeightM),
    fresnelUpper: /* ... */,
    fresnelLower: /* ... */,
    clearance: profile.fresnelClearance[i],
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={data}
        margin={{ top: 12, right: 16, bottom: 4, left: 8 }}
      >
        {/* ── Grid ──────────────────────────────────────── */}
        <CartesianGrid
          stroke={CHART_COLORS.grid}
          strokeDasharray="3 3"
          vertical={false}           // only horizontal grid lines
        />

        {/* ── Axes ──────────────────────────────────────── */}
        <XAxis
          dataKey="distance"
          tick={CHART_FONTS.tick}
          tickLine={{ stroke: CHART_COLORS.grid }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickFormatter={(v: number) => `${v.toFixed(1)}`}
          label={{
            value: 'km',
            position: 'insideBottomRight',
            offset: -4,
            ...CHART_FONTS.label,
          }}
        />
        <YAxis
          tick={CHART_FONTS.tick}
          tickLine={{ stroke: CHART_COLORS.grid }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickFormatter={(v: number) => `${v.toFixed(0)}`}
          label={{
            value: 'm ASL',
            angle: -90,
            position: 'insideLeft',
            offset: 10,
            ...CHART_FONTS.label,
          }}
          domain={['dataMin - 20', 'dataMax + 40']}
        />

        {/* ── Terrain fill ──────────────────────────────── */}
        <Area
          type="monotone"
          dataKey="terrain"
          stroke={CHART_COLORS.terrainStroke}
          strokeWidth={1.5}
          fill={CHART_COLORS.terrain}
          fillOpacity={1}
          isAnimationActive={false}    // no animation — data appears instantly
        />

        {/* ── Fresnel zone (draw BEFORE LOS line so it sits behind) ── */}
        <Area
          type="monotone"
          dataKey="fresnelUpper"
          stroke="none"
          fill={CHART_COLORS.fresnelZone}
          fillOpacity={0.12}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="fresnelLower"
          stroke="none"
          fill="transparent"          // lower bound erases the fill above
          fillOpacity={0}
          isAnimationActive={false}
        />

        {/* ── LOS line (geometric straight line, no curvature) ── */}
        <Line
          type="linear"
          dataKey="losLine"
          stroke={CHART_COLORS.los}
          strokeWidth={1}
          strokeDasharray="6 4"
          dot={false}
          isAnimationActive={false}
        />

        {/* ── Tooltip ───────────────────────────────────── */}
        <Tooltip
          content={<ProfileTooltip />}
          cursor={{
            stroke: CHART_COLORS.axis,
            strokeWidth: 1,
            strokeDasharray: '4 4',
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

## Custom tooltip

Always use a custom tooltip component. The default Recharts tooltip doesn't match the dark theme.

```tsx
function ProfileTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-md border px-3 py-2 shadow-lg"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
      }}
    >
      <p className="font-mono text-[11px] text-muted-foreground mb-1">
        {Number(label).toFixed(2)} km
      </p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="text-[13px]" style={{ color: entry.color }}>
          <span className="text-muted-foreground">{formatLabel(entry.dataKey)}:</span>{' '}
          <span className="font-mono font-medium">
            {Number(entry.value).toFixed(1)} m
          </span>
        </p>
      ))}
    </div>
  );
}

function formatLabel(key: string): string {
  const labels: Record<string, string> = {
    terrain: 'Terrain',
    losLine: 'LOS line',
    fresnelUpper: 'Fresnel upper',
    clearance: 'Clearance',
  };
  return labels[key] ?? key;
}
```

## Signal strength bar chart (if needed for link summary)

```tsx
<ResponsiveContainer width="100%" height={32}>
  <BarChart data={[{ value: marginDb, max: 40 }]} layout="vertical">
    <XAxis type="number" domain={[0, 40]} hide />
    <YAxis type="category" dataKey="name" hide />
    <Bar
      dataKey="value"
      radius={[4, 4, 4, 4]}
      fill={marginDb > 20 ? CHART_COLORS.signalExcellent
          : marginDb > 10 ? CHART_COLORS.signalGood
          : marginDb > 0  ? CHART_COLORS.signalFair
          : CHART_COLORS.signalWeak}
      isAnimationActive={false}
    />
  </BarChart>
</ResponsiveContainer>
```

## Global chart rules

1. **Never use Recharts animation.** Set `isAnimationActive={false}` on every `<Area>`, `<Line>`, and `<Bar>`. Coverage data updates frequently during editing and animation creates lag and visual noise.

2. **Always use `<ResponsiveContainer>`.** Never set fixed width/height on the chart itself. The container adapts to the sidebar width.

3. **Always use the custom tooltip.** Never rely on the default Recharts tooltip.

4. **Axis formatting:**
   - Distance axis: kilometres with 1 decimal (`2.4 km`)
   - Elevation axis: metres with 0 decimals (`142 m`)
   - Signal axis: dBm with 0 decimals (`-98 dBm`)
   - Always use JetBrains Mono for axis ticks

5. **No chart legends.** The elevation profile has a fixed set of series that are always visible. Use the colour coding and the link summary panel to explain what's what. A legend wastes vertical space in the narrow sidebar.

6. **Chart height:** 220px for the elevation profile. This leaves room for the link summary table below it in the sidebar.

7. **Chart margins:** `{ top: 12, right: 16, bottom: 4, left: 8 }` — tight but with room for axis labels.

8. **Area fill strategy for terrain:** Use `fillOpacity={1}` with a solid dark colour. This creates a "mountain silhouette" effect against the darker chart background. Do NOT use gradient fills on the terrain — it looks like generic dashboard slop.

## Colour accessibility

The chart uses shape and position (not just colour) to communicate:
- Terrain is a solid filled area (shape distinction from lines)
- LOS is dashed (pattern distinction)
- Fresnel zone is a translucent region (opacity distinction)
- Obstruction points could be marked with reference dots if needed

The red/green combination for Fresnel clear/blocked is the only colour-only distinction. This is acceptable because the link summary panel always provides a textual status alongside it.

## Rendering Fresnel zones correctly

The Fresnel zone is the area between two curves: the upper boundary and the lower boundary, centred on the effective LOS line. Recharts doesn't support "area between two lines" natively. The workaround:

**Option A (simpler): Single area with clip.** Render a single `<Area>` for the Fresnel zone radius above the LOS line, and rely on the terrain fill covering the lower portion. This works when the Fresnel zone doesn't extend below the terrain.

**Option B (precise): Stacked areas with baseline.** Render the full Fresnel zone as a `<ReferenceArea>` for each segment, switching colour between clear (green) and blocked (red) based on the clearance data. This is more complex but visually correct.

Recommend starting with **Option A** and upgrading to Option B only if the visual result is confusing.
