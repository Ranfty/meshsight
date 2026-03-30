import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { calculateLinkBudget } from '@/engine/linkbudget';
import ElevationProfileChart from '@/components/map/ElevationProfileChart';
import type { ElevationProfile, MeshNode, LoRaConfig } from '@/types';

const SPEED_OF_LIGHT_MS = 299_792_458;

function computeLinkSummary(
  profile: ElevationProfile,
  txNode: MeshNode,
  rxNode: MeshNode,
  loraConfig: LoRaConfig,
) {
  const pts = profile.points;
  const totalDistanceM = pts[pts.length - 1].distanceM;
  const totalDistanceKm = totalDistanceM / 1000;

  // Find worst Fresnel clearance
  let minClearanceM = Infinity;
  let minClearanceIdx = -1;
  for (let i = 0; i < profile.fresnelClearance.length; i++) {
    const c = profile.fresnelClearance[i];
    if (isFinite(c) && c < minClearanceM) {
      minClearanceM = c;
      minClearanceIdx = i;
    }
  }

  let worstFresnelRadiusM: number | undefined;
  let minClearanceDistKm = 0;
  if (minClearanceIdx >= 0) {
    const pt = pts[minClearanceIdx + 1]; // +1 to skip TX endpoint
    if (pt && totalDistanceM > 0) {
      const dTx = pt.distanceM;
      const dRx = totalDistanceM - dTx;
      const wavelengthM = SPEED_OF_LIGHT_MS / (loraConfig.frequencyMhz * 1_000_000);
      worstFresnelRadiusM = Math.sqrt((wavelengthM * dTx * dRx) / totalDistanceM);
      minClearanceDistKm = dTx / 1000;
    }
  }

  const budget = calculateLinkBudget(
    totalDistanceKm,
    loraConfig.frequencyMhz,
    txNode.txPowerDbm,
    txNode.antennaGainDbi,
    rxNode.antennaGainDbi,
    loraConfig.rxSensitivityDbm,
    10,
    minClearanceIdx >= 0 ? minClearanceM : undefined,
    worstFresnelRadiusM,
  );

  return {
    totalDistanceKm,
    budget,
    minClearanceM: minClearanceIdx >= 0 ? minClearanceM : null,
    minClearanceDistKm,
    txGroundElevM: pts[0].elevationM,
    rxGroundElevM: pts[pts.length - 1].elevationM,
  };
}

function MarginColor({ margin }: { margin: number }) {
  const color =
    margin > 20 ? '#3ecf8e' : margin > 10 ? '#f59e42' : margin > 0 ? '#ef4444' : '#8892a4';
  return (
    <span className="font-mono text-[13px] font-medium" style={{ color }}>
      {margin > 0 ? '+' : ''}{margin.toFixed(1)} dB
    </span>
  );
}

export default function LinkAnalysis() {
  const nodes = useStore((s) => s.nodes);
  const loraConfig = useStore((s) => s.loraConfig);
  const linkEndpoints = useStore((s) => s.linkEndpoints);
  const linkProfile = useStore((s) => s.linkProfile);
  const linkProfileCalculating = useStore((s) => s.linkProfileCalculating);

  const [txId, rxId] = linkEndpoints;
  const txNode = nodes.find((n) => n.id === txId) ?? null;
  const rxNode = nodes.find((n) => n.id === rxId) ?? null;

  if (!txId) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Click the{' '}
        <span className="text-foreground font-medium">Link</span> toggle, then click
        two nodes to analyse the path between them.
      </p>
    );
  }

  if (!rxId) {
    return (
      <p className="text-[13px] text-muted-foreground">
        TX node selected: <span className="text-foreground font-medium">{txNode?.name}</span>.
        Now click a second node to analyse the link.
      </p>
    );
  }

  if (linkProfileCalculating) {
    return (
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Calculating link profile…
      </div>
    );
  }

  if (!linkProfile || !txNode || !rxNode) return null;

  const summary = computeLinkSummary(linkProfile, txNode, rxNode, loraConfig);
  const { budget, totalDistanceKm, minClearanceM, minClearanceDistKm } = summary;
  const linkViable = budget.marginDb > 0;

  const metrics: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: 'Distance',
      value: <span className="font-mono text-[13px] font-medium">{totalDistanceKm.toFixed(2)} km</span>,
    },
    {
      label: 'Status',
      value: linkViable ? (
        <span className="flex items-center gap-1 text-[13px] font-medium" style={{ color: '#3ecf8e' }}>
          <CheckCircle2 size={13} /> Viable
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[13px] font-medium" style={{ color: '#ef4444' }}>
          <XCircle size={13} /> No link
        </span>
      ),
    },
    {
      label: 'Path Loss',
      value: <span className="font-mono text-[13px] font-medium">{budget.pathLossDb.toFixed(1)} dB</span>,
    },
    {
      label: 'Rx Signal',
      value: <span className="font-mono text-[13px] font-medium">{budget.receivedPowerDbm.toFixed(1)} dBm</span>,
    },
    {
      label: 'Link Margin',
      value: <MarginColor margin={budget.marginDb} />,
    },
    {
      label: 'Fresnel Min',
      value: minClearanceM !== null ? (
        <span className="font-mono text-[13px] font-medium" style={{ color: minClearanceM >= 0 ? '#3ecf8e' : '#ef4444' }}>
          {minClearanceM >= 0 ? '+' : ''}{minClearanceM.toFixed(1)} m @ {minClearanceDistKm.toFixed(1)} km
        </span>
      ) : (
        <span className="font-mono text-[13px] text-muted-foreground">—</span>
      ),
    },
    {
      label: 'TX Elevation',
      value: (
        <span className="font-mono text-[13px] font-medium">
          {summary.txGroundElevM.toFixed(0)} m + {txNode.antennaHeightM} m
        </span>
      ),
    },
    {
      label: 'RX Elevation',
      value: (
        <span className="font-mono text-[13px] font-medium">
          {summary.rxGroundElevM.toFixed(0)} m + {rxNode.antennaHeightM} m
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
        <span style={{ color: txNode.color }}>{txNode.name}</span>
        <span>→</span>
        <span style={{ color: rxNode.color }}>{rxNode.name}</span>
      </div>

      <ElevationProfileChart
        profile={linkProfile}
        txHeightM={txNode.antennaHeightM}
        rxHeightM={rxNode.antennaHeightM}
        frequencyMhz={loraConfig.frequencyMhz}
      />

      <div className="grid grid-cols-2 gap-2">
        {metrics.map(({ label, value }) => (
          <div key={label} className="bg-muted rounded-md p-2.5">
            <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
            <div className="mt-0.5">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
