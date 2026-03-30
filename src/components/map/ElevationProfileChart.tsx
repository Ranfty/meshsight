import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ElevationProfile } from '@/types';
import { CHART_COLORS, CHART_FONTS } from '@/data/chartTheme';

const SPEED_OF_LIGHT_MS = 299_792_458;

interface ChartPoint {
  distanceKm: number;
  terrain: number;
  losLine: number;
  fresnelUpper: number;
  clearance?: number;
}

/** Returns evenly-spaced, human-friendly tick values for the distance axis. */
function niceXTicks(maxKm: number): number[] {
  const candidates = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  const targetCount = 6;
  const rawStep = maxKm / targetCount;
  const step = candidates.find((s) => s >= rawStep) ?? 200;
  const ticks: number[] = [];
  for (let t = 0; t <= maxKm + step * 0.001; t = parseFloat((t + step).toFixed(10))) {
    ticks.push(parseFloat(t.toFixed(6)));
    if (ticks.length > 20) break; // safety
  }
  return ticks;
}

function formatXTick(v: number): string {
  return v % 1 === 0 ? v.toFixed(0) : v.toFixed(1);
}

function computeChartData(
  profile: ElevationProfile,
  txHeightM: number,
  rxHeightM: number,
  frequencyMhz: number,
): ChartPoint[] {
  const pts = profile.points;
  if (pts.length < 2) return [];

  const totalDistanceM = pts[pts.length - 1].distanceM;
  const txTipM = pts[0].elevationM + txHeightM;
  const rxTipM = pts[pts.length - 1].elevationM + rxHeightM;
  const wavelengthM = SPEED_OF_LIGHT_MS / (frequencyMhz * 1_000_000);

  return pts.map((pt, i) => {
    const distanceKm = pt.distanceM / 1000;
    const fraction = totalDistanceM > 0 ? pt.distanceM / totalDistanceM : 0;
    const losLine = txTipM + fraction * (rxTipM - txTipM);

    let fresnelRadius = 0;
    if (i > 0 && i < pts.length - 1 && totalDistanceM > 0) {
      const dTx = pt.distanceM;
      const dRx = totalDistanceM - dTx;
      fresnelRadius = Math.sqrt((wavelengthM * dTx * dRx) / totalDistanceM);
    }

    const clearance =
      i > 0 && i < pts.length - 1 ? profile.fresnelClearance[i - 1] : undefined;

    return {
      distanceKm,
      terrain: pt.elevationM,
      losLine,
      fresnelUpper: losLine + fresnelRadius,
      clearance,
    };
  });
}

function ProfileTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  const terrainVal = payload.find((p) => p.dataKey === 'terrain')?.value;
  const losVal = payload.find((p) => p.dataKey === 'losLine')?.value;
  const clearanceVal = payload.find((p) => p.dataKey === 'clearance')?.value;

  return (
    <div
      className="rounded-md border px-3 py-2 shadow-lg text-[13px]"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
        color: CHART_COLORS.tooltipText,
      }}
    >
      <p className="font-mono text-[11px] mb-1" style={{ color: CHART_COLORS.axis }}>
        {Number(label).toFixed(2)} km
      </p>
      {terrainVal !== undefined && (
        <p>
          <span style={{ color: CHART_COLORS.axis }}>Terrain: </span>
          <span className="font-mono font-medium">{terrainVal.toFixed(0)} m</span>
        </p>
      )}
      {losVal !== undefined && (
        <p>
          <span style={{ color: CHART_COLORS.axis }}>LOS: </span>
          <span className="font-mono font-medium">{losVal.toFixed(0)} m</span>
        </p>
      )}
      {clearanceVal !== undefined && isFinite(clearanceVal) && (
        <p>
          <span style={{ color: CHART_COLORS.axis }}>Clearance: </span>
          <span
            className="font-mono font-medium"
            style={{ color: clearanceVal >= 0 ? '#3ecf8e' : '#ef4444' }}
          >
            {clearanceVal >= 0 ? '+' : ''}{clearanceVal.toFixed(1)} m
          </span>
        </p>
      )}
    </div>
  );
}

interface ElevationProfileChartProps {
  profile: ElevationProfile;
  txHeightM: number;
  rxHeightM: number;
  frequencyMhz: number;
}

export default function ElevationProfileChart({
  profile,
  txHeightM,
  rxHeightM,
  frequencyMhz,
}: ElevationProfileChartProps) {
  const data = computeChartData(profile, txHeightM, rxHeightM, frequencyMhz);
  if (data.length === 0) return null;

  const maxKm = data[data.length - 1].distanceKm;
  const xTicks = niceXTicks(maxKm);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid
          stroke={CHART_COLORS.grid}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          dataKey="distanceKm"
          type="number"
          domain={[0, maxKm]}
          ticks={xTicks}
          tick={CHART_FONTS.tick}
          tickLine={{ stroke: CHART_COLORS.grid }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickFormatter={formatXTick}
          label={{ value: 'km', position: 'insideBottomRight', offset: -4, ...CHART_FONTS.label }}
        />
        <YAxis
          tick={CHART_FONTS.tick}
          tickLine={{ stroke: CHART_COLORS.grid }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickFormatter={(v: number) => v.toFixed(0)}
          label={{ value: 'm ASL', angle: -90, position: 'insideLeft', offset: 10, ...CHART_FONTS.label }}
          domain={['dataMin - 20', 'dataMax + 40']}
        />

        {/* Fresnel zone rendered first (behind terrain) */}
        <Area
          type="monotone"
          dataKey="fresnelUpper"
          stroke="none"
          fill={CHART_COLORS.fresnelZone}
          fillOpacity={0.15}
          isAnimationActive={false}
        />

        {/* Terrain fill — rendered on top of Fresnel zone */}
        <Area
          type="monotone"
          dataKey="terrain"
          stroke={CHART_COLORS.terrainStroke}
          strokeWidth={1.5}
          fill={CHART_COLORS.terrain}
          fillOpacity={1}
          isAnimationActive={false}
        />

        {/* LOS line */}
        <Line
          type="linear"
          dataKey="losLine"
          stroke={CHART_COLORS.los}
          strokeWidth={1}
          strokeDasharray="6 4"
          dot={false}
          isAnimationActive={false}
        />

        <Tooltip
          content={<ProfileTooltip />}
          cursor={{ stroke: CHART_COLORS.axis, strokeWidth: 1, strokeDasharray: '4 4' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
