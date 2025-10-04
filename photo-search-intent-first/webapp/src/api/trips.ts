import { API_BASE, post } from "./base";

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  photos: string[];
  place?: string;
  start_ts?: number;
  end_ts?: number;
  paths: string[];
  count: number;
}

export interface TripsBuildResponse {
  trips: Trip[];
}

export interface TripsListResponse {
  trips: Trip[];
}

/**
 * Build trips from photos using clustering of time and location data
 */
export async function buildTrips(
  dir: string,
  provider: string
): Promise<TripsBuildResponse> {
  return post<TripsBuildResponse>("/trips/build", { dir, provider });
}

/**
 * List existing trips for a directory
 */
export async function getTrips(dir: string): Promise<TripsListResponse> {
  const r = await fetch(`${API_BASE}/trips?dir=${encodeURIComponent(dir)}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<TripsListResponse>;
}

/**
 * Get photos for a specific trip
 */
export async function getTripPhotos(
  dir: string,
  tripId: string
): Promise<{ photos: string[] }> {
  const r = await fetch(
    `${API_BASE}/trips/${encodeURIComponent(
      tripId
    )}/photos?dir=${encodeURIComponent(dir)}`
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ photos: string[] }>;
}

/**
 * Update trip metadata (name, dates, etc.)
 */
export async function updateTrip(
  dir: string,
  tripId: string,
  updates: Partial<Pick<Trip, "name" | "startDate" | "endDate">>
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/trips/${encodeURIComponent(tripId)}`, {
    dir,
    ...updates,
  });
}

/**
 * Delete a trip
 */
export async function deleteTrip(
  dir: string,
  tripId: string
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/trips/${encodeURIComponent(tripId)}/delete`, {
    dir,
  });
}

// Backward compatible convenience functions
export async function apiTripsBuild(dir: string, provider: string) {
  return buildTrips(dir, provider);
}

export async function apiTripsList(dir: string) {
  return getTrips(dir);
}

export async function apiGetTripPhotos(dir: string, tripId: string) {
  return getTripPhotos(dir, tripId);
}

export async function apiUpdateTrip(
  dir: string,
  tripId: string,
  updates: Partial<Pick<Trip, "name" | "startDate" | "endDate">>
) {
  return updateTrip(dir, tripId, updates);
}

export async function apiDeleteTrip(dir: string, tripId: string) {
  return deleteTrip(dir, tripId);
}
