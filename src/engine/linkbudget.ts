/**
 * LoRa link budget calculator for MeshSight.
 *
 * No DOM or React imports — safe for use in Web Workers.
 */

import { fsplDb, diffractionLossDb } from './propagation';

export type LinkStatus = 'viable' | 'marginal' | 'not_viable';

/** Minimum headroom above the fade-margin threshold before a link is considered marginal. */
export const MARGINAL_MARGIN_FLOOR_DB = 10;

/** Fresnel clearance floor: obstruction deeper than this triggers marginal status. */
export const MARGINAL_FRESNEL_FLOOR_M = -10;

/** Path distance beyond which reliable delivery becomes uncertain for typical LoRa presets. */
export const MARGINAL_DISTANCE_FLOOR_KM = 35;

export interface LinkBudgetResult {
  txPowerDbm: number;
  txAntennaGainDbi: number;
  rxAntennaGainDbi: number;
  pathLossDb: number;
  diffractionLossDb: number;
  receivedPowerDbm: number;
  rxSensitivityDbm: number;
  /** receivedPower − rxSensitivity */
  marginDb: number;
  /** Configurable fade margin (default 10 dB) */
  fadeMarginDb: number;
  /** True when marginDb > fadeMarginDb */
  linkViable: boolean;
  /** Three-tier link quality classification */
  linkStatus: LinkStatus;
  /** Theoretical maximum range in free space (km) */
  maxRangeKm: number;
}

/**
 * Calculate the full LoRa link budget between two nodes.
 *
 * @param distanceKm       - Link distance in kilometres
 * @param frequencyMhz     - Operating frequency in MHz
 * @param txPowerDbm       - Transmit power in dBm
 * @param txAntennaGainDbi - TX antenna gain in dBi
 * @param rxAntennaGainDbi - RX antenna gain in dBi
 * @param rxSensitivityDbm - RX sensitivity in dBm (e.g. -123 for LONG_FAST)
 * @param fadeMarginDb     - Required fade margin in dB (default 10)
 * @param fresnelClearanceM - Clearance at worst obstruction point (metres, optional)
 * @param fresnelRadiusM    - First Fresnel zone radius at that point (metres, optional)
 */
export function calculateLinkBudget(
  distanceKm: number,
  frequencyMhz: number,
  txPowerDbm: number,
  txAntennaGainDbi: number,
  rxAntennaGainDbi: number,
  rxSensitivityDbm: number,
  fadeMarginDb = 10,
  fresnelClearanceM?: number,
  fresnelRadiusM?: number,
): LinkBudgetResult {
  const pathLoss = fsplDb(distanceKm, frequencyMhz);

  const diffractionLoss =
    fresnelClearanceM !== undefined && fresnelRadiusM !== undefined
      ? diffractionLossDb(fresnelClearanceM, fresnelRadiusM)
      : 0;

  const receivedPowerDbm =
    txPowerDbm + txAntennaGainDbi + rxAntennaGainDbi - pathLoss - diffractionLoss;

  const marginDb = receivedPowerDbm - rxSensitivityDbm;

  // Max range: solve FSPL(d) = txPower + txGain + rxGain − rxSensitivity − fadeMargin
  // 20×log10(d) = budget − 20×log10(f) − 32.44
  const fsplBudgetDb = txPowerDbm + txAntennaGainDbi + rxAntennaGainDbi - rxSensitivityDbm - fadeMarginDb;
  const maxRangeKm = Math.pow(10, (fsplBudgetDb - 20 * Math.log10(frequencyMhz) - 32.44) / 20);

  const linkViable = marginDb > fadeMarginDb;

  let linkStatus: LinkStatus;
  if (!linkViable) {
    linkStatus = 'not_viable';
  } else {
    const thinMargin = marginDb < fadeMarginDb + MARGINAL_MARGIN_FLOOR_DB;
    const poorFresnel =
      fresnelClearanceM !== undefined && fresnelClearanceM < MARGINAL_FRESNEL_FLOOR_M;
    const longPath = distanceKm > MARGINAL_DISTANCE_FLOOR_KM;
    linkStatus = thinMargin || poorFresnel || longPath ? 'marginal' : 'viable';
  }

  return {
    txPowerDbm,
    txAntennaGainDbi,
    rxAntennaGainDbi,
    pathLossDb: pathLoss,
    diffractionLossDb: diffractionLoss,
    receivedPowerDbm,
    rxSensitivityDbm,
    marginDb,
    fadeMarginDb,
    linkViable,
    linkStatus,
    maxRangeKm,
  };
}
