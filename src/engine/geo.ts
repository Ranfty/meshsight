/**
 * Geographic utility functions for MeshSight.
 * All distances in metres, bearings in degrees, coordinates in decimal degrees.
 * No DOM or React dependencies — safe for use in Web Workers.
 */

const EARTH_RADIUS_M = 6_371_000;

/**
 * Haversine great-circle distance between two lat/lng points in metres.
 */
export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Initial bearing (forward azimuth) from point 1 to point 2, in degrees (0–360).
 */
export function initialBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const dLng = toRad(lng2 - lng1);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Destination point given a start point, bearing (degrees), and distance (metres).
 * Uses the spherical earth model.
 */
export function destinationPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number,
): { lat: number; lng: number } {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const delta = distanceM / EARTH_RADIUS_M;
  const bearingRad = toRad(bearingDeg);
  const latRad = toRad(lat);
  const lngRad = toRad(lng);

  const destLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(delta) +
      Math.cos(latRad) * Math.sin(delta) * Math.cos(bearingRad),
  );

  const destLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(delta) * Math.cos(latRad),
      Math.cos(delta) - Math.sin(latRad) * Math.sin(destLatRad),
    );

  return {
    lat: toDeg(destLatRad),
    lng: ((toDeg(destLngRad) + 540) % 360) - 180, // normalise to -180..+180
  };
}

/**
 * Convert lat/lng to Slippy Map tile coordinates at the given zoom level.
 * Returns integer tile x/y (floor).
 */
export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      n,
  );
  return { x, y };
}

/**
 * Convert tile x/y at zoom to the lat/lng of the tile's North-West corner.
 */
export function tileToLatLng(
  x: number,
  y: number,
  zoom: number,
): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}
