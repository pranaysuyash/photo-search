import { API_BASE, post } from "./base";

export interface FaceCluster {
  id: string;
  name?: string;
  size: number;
  examples: [string, number][];
}

export interface FaceClustersResponse {
  clusters: FaceCluster[];
}

export interface BuildFacesResponse {
  updated: number;
  faces: number;
  clusters: number;
}

export interface FacePhotosResponse {
  photos: string[];
}

/**
 * Build face index for the specified directory
 */
export async function buildFaces(
  dir: string,
  provider: string
): Promise<BuildFacesResponse> {
  return post<BuildFacesResponse>("/faces/build", { dir, provider });
}

/**
 * Get face clusters for a directory
 */
export async function getFaceClusters(
  dir: string
): Promise<FaceClustersResponse> {
  const r = await fetch(
    `${API_BASE}/faces/clusters?dir=${encodeURIComponent(dir)}`
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<FaceClustersResponse>;
}

/**
 * Assign a name to a face cluster
 */
export async function nameFaceCluster(
  dir: string,
  clusterId: string,
  name: string
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/faces/name", {
    dir,
    cluster_id: clusterId,
    name,
  });
}

/**
 * Get photos for a specific face cluster
 */
export async function getFacePhotos(
  dir: string,
  clusterId: string
): Promise<FacePhotosResponse> {
  const r = await fetch(
    `${API_BASE}/faces/photos?dir=${encodeURIComponent(
      dir
    )}&cluster_id=${encodeURIComponent(clusterId)}`
  );
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<FacePhotosResponse>;
}

/**
 * Merge multiple face clusters
 */
export async function mergeFaceClusters(
  dir: string,
  clusterIds: string[],
  newName?: string
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>("/faces/merge", {
    dir,
    cluster_ids: clusterIds,
    new_name: newName,
  });
}

// Backward compatible convenience functions
export async function apiBuildFaces(dir: string, provider: string) {
  return buildFaces(dir, provider);
}

export async function apiFacesClusters(dir: string) {
  return getFaceClusters(dir);
}

export async function apiFacesName(
  dir: string,
  clusterId: string,
  name: string
) {
  return nameFaceCluster(dir, clusterId, name);
}

export async function apiGetFacePhotos(dir: string, clusterId: string) {
  return getFacePhotos(dir, clusterId);
}

export async function apiMergeFaceClusters(
  dir: string,
  clusterIds: string[],
  newName?: string
) {
  return mergeFaceClusters(dir, clusterIds, newName);
}
