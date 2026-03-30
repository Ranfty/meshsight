export const CHART_COLORS = {
  terrain: '#2a3142',
  terrainStroke: '#3a4458',
  los: '#8892a4',
  fresnelZone: '#8b5cf6',
  grid: '#1c2230',
  axis: '#8892a4',
  axisLabel: '#8892a4',
  tooltipBg: '#151921',
  tooltipBorder: '#2a3142',
  tooltipText: '#e2e6ed',
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
} as const;
