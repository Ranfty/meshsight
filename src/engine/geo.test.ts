import { describe, it, expect } from 'vitest';
import {
  haversineDistanceM,
  initialBearingDeg,
  destinationPoint,
  latLngToTile,
  tileToLatLng,
} from './geo';

describe('haversineDistanceM', () => {
  it('London to Paris ≈ 343 km', () => {
    // London: 51.5074°N, 0.1278°W   Paris: 48.8566°N, 2.3522°E
    const distanceM = haversineDistanceM(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distanceM).toBeGreaterThan(342_000);
    expect(distanceM).toBeLessThan(344_000);
  });

  it('same point returns 0', () => {
    expect(haversineDistanceM(51.5, -0.1, 51.5, -0.1)).toBeCloseTo(0, 0);
  });

  it('antipodal points return ≈ half earth circumference', () => {
    const halfCircumferenceM = Math.PI * 6_371_000;
    const d = haversineDistanceM(0, 0, 0, 180);
    expect(d).toBeCloseTo(halfCircumferenceM, -3);
  });
});

describe('initialBearingDeg', () => {
  it('London to Paris ≈ 148°', () => {
    // London: 51.5074°N, 0.1278°W   Paris: 48.8566°N, 2.3522°E
    // Verified against Movable Type geodesy reference: initial bearing ≈ 148°
    const bearing = initialBearingDeg(51.5074, -0.1278, 48.8566, 2.3522);
    expect(bearing).toBeGreaterThan(146);
    expect(bearing).toBeLessThan(150);
  });

  it('due north is 0°', () => {
    const bearing = initialBearingDeg(0, 0, 10, 0);
    expect(bearing).toBeCloseTo(0, 0);
  });

  it('due east is 90°', () => {
    const bearing = initialBearingDeg(0, 0, 0, 10);
    expect(bearing).toBeCloseTo(90, 0);
  });

  it('due south is 180°', () => {
    const bearing = initialBearingDeg(10, 0, 0, 0);
    expect(bearing).toBeCloseTo(180, 0);
  });

  it('due west is 270°', () => {
    const bearing = initialBearingDeg(0, 10, 0, 0);
    expect(bearing).toBeCloseTo(270, 0);
  });
});

describe('destinationPoint', () => {
  it('travelling 1000 km north from the equator reaches ≈ 9°N', () => {
    const dest = destinationPoint(0, 0, 0, 1_000_000);
    expect(dest.lat).toBeCloseTo(8.99, 1);
    expect(dest.lng).toBeCloseTo(0, 1);
  });

  it('round-trip using computed reverse bearing returns to origin', () => {
    // For a spherical round-trip we must compute the reverse bearing at the
    // destination — simply adding 180° to the initial bearing only works for
    // infinitesimally short paths.
    const from = { lat: 51.5, lng: -0.1 };
    const dest = destinationPoint(from.lat, from.lng, 45, 100_000);
    const reverseBearing = initialBearingDeg(dest.lat, dest.lng, from.lat, from.lng);
    const back = destinationPoint(dest.lat, dest.lng, reverseBearing, 100_000);
    expect(back.lat).toBeCloseTo(from.lat, 2);
    expect(back.lng).toBeCloseTo(from.lng, 2);
  });

  it('longitude is normalised to -180..+180', () => {
    const dest = destinationPoint(0, 170, 90, 2_000_000);
    expect(dest.lng).toBeGreaterThanOrEqual(-180);
    expect(dest.lng).toBeLessThanOrEqual(180);
  });
});

describe('latLngToTile / tileToLatLng', () => {
  it('tile NW corner round-trips through tileToLatLng', () => {
    const zoom = 10;
    const { x, y } = latLngToTile(51.5, -0.1, zoom);
    const nw = tileToLatLng(x, y, zoom);
    // NW corner must be ≥ the original lat and ≤ the original lng
    expect(nw.lat).toBeGreaterThanOrEqual(51.5);
    expect(nw.lng).toBeLessThanOrEqual(-0.1);
  });

  it('London falls inside its own tile bounds', () => {
    const zoom = 10;
    const lat = 51.5074;
    const lng = -0.1278;
    const { x, y } = latLngToTile(lat, lng, zoom);
    const nw = tileToLatLng(x, y, zoom);
    const se = tileToLatLng(x + 1, y + 1, zoom);
    expect(lat).toBeLessThanOrEqual(nw.lat);
    expect(lat).toBeGreaterThanOrEqual(se.lat);
    expect(lng).toBeGreaterThanOrEqual(nw.lng);
    expect(lng).toBeLessThanOrEqual(se.lng);
  });

  it('known tile coordinate for London at zoom 10', () => {
    // Pre-computed: London (51.5074, -0.1278) at z10 → tile (511, 340)
    const { x, y } = latLngToTile(51.5074, -0.1278, 10);
    expect(x).toBe(511);
    expect(y).toBe(340);
  });
});
