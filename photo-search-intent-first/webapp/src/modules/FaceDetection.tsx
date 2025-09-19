import { Check, Edit2, RefreshCw, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAPI } from "../services/PhotoVaultAPI";

interface FaceCluster {
	id: string;
	name?: string;
	size: number;
	examples: [string, number][];
}

export function FaceDetection() {
	const [clusters, setClusters] = useState<FaceCluster[]>([]);
	const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
	const [editingCluster, setEditingCluster] = useState<string | null>(null);
	const [newName, setNewName] = useState("");
	const [loading, setLoading] = useState(false);
	const [building, setBuilding] = useState(false);
	const [stats, setStats] = useState({ totalFaces: 0, namedPeople: 0 });

	const api = getAPI();

	const loadClusters = useCallback(async () => {
		setLoading(true);
		try {
			const data = await api.getFaceClusters();
			setClusters(data.clusters);

			const totalFaces = data.clusters.reduce((sum, c) => sum + c.size, 0);
			const namedPeople = data.clusters.filter((c) => c.name).length;
			setStats({ totalFaces, namedPeople });
		} catch (error) {
			console.error("Failed to load face clusters:", error);
		} finally {
			setLoading(false);
		}
	}, [api]);

	useEffect(() => {
		loadClusters();
	}, [loadClusters]);

	const buildFaceIndex = async () => {
		setBuilding(true);
		try {
			const result = await api.buildFaces();
			console.log(
				`Built faces: ${result.faces} faces in ${result.clusters} clusters`,
			);
			await loadClusters();
		} catch (error) {
			console.error("Failed to build face index:", error);
		} finally {
			setBuilding(false);
		}
	};

	const nameCluster = async (clusterId: string) => {
		if (!newName.trim()) return;

		try {
			await api.nameFaceCluster(clusterId, newName);
			await loadClusters();
			setEditingCluster(null);
			setNewName("");
		} catch (error) {
			console.error("Failed to name cluster:", error);
		}
	};

	const FaceClusterCard = ({ cluster }: { cluster: FaceCluster }) => (
		<div
			className={`face-cluster-card ${
				selectedCluster === cluster.id ? "selected" : ""
			}`}
		>
			<div className="cluster-header">
				{editingCluster === cluster.id ? (
					<div className="name-editor">
						<input
							type="text"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="Enter name..."
							className="name-input"
							onClick={(e) => e.stopPropagation()}
						/>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								nameCluster(cluster.id);
							}}
							className="btn-icon"
							aria-label="Save name"
						>
							<Check className="w-4 h-4" />
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setEditingCluster(null);
								setNewName("");
							}}
							className="btn-icon"
							aria-label="Cancel editing"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				) : (
					<>
						<button
							type="button"
							className="face-cluster-button"
							onClick={() => setSelectedCluster(cluster.id)}
							aria-label={`Select face cluster ${
								cluster.name || `Person ${cluster.id.slice(0, 8)}`
							}`}
						>
							<h3 className="cluster-name">
								{cluster.name || `Person ${cluster.id.slice(0, 8)}`}
							</h3>
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setEditingCluster(cluster.id);
								setNewName(cluster.name || "");
							}}
							className="btn-icon"
							aria-label="Edit name"
						>
							<Edit2 className="w-4 h-4" />
						</button>
					</>
				)}
			</div>

			<div className="cluster-stats">
				<span className="text-sm text-gray-500">{cluster.size} photos</span>
			</div>

			<button
				type="button"
				className="face-cluster-button"
				onClick={() => setSelectedCluster(cluster.id)}
				aria-label={`Select face cluster ${
					cluster.name || `Person ${cluster.id.slice(0, 8)}`
				}`}
			>
				<div className="face-examples">
					{cluster.examples.slice(0, 4).map(([path, embIdx], i) => (
						<div key={`item-${String(path)}`} className="face-thumbnail">
							<img
								src={api.getFaceThumbnailUrl(path, embIdx, 96)}
								alt={`Face ${i + 1}`}
							/>
						</div>
					))}
				</div>
			</button>
		</div>
	);

	return (
		<div className="face-detection">
			<div className="detection-header">
				<div>
					<h2 className="text-2xl font-bold flex items-center gap-2">
						<Users className="w-6 h-6" />
						People
					</h2>
					<p className="text-gray-500 mt-1">
						{stats.totalFaces} faces detected • {stats.namedPeople} people
						identified
					</p>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={buildFaceIndex}
						disabled={building}
						className="btn btn-secondary"
					>
						<RefreshCw
							className={`w-4 h-4 ${building ? "animate-spin" : ""}`}
						/>
						{building ? "Building..." : "Rebuild Index"}
					</button>
				</div>
			</div>

			{loading ? (
				<div className="loading-state">
					<div className="spinner" />
					<p>Loading faces...</p>
				</div>
			) : clusters.length === 0 ? (
				<div className="empty-state">
					<Users className="w-16 h-16 text-gray-300" />
					<h3 className="text-xl font-semibold mt-4">No faces detected yet</h3>
					<p className="text-gray-500 mt-2">
						Build the face index to detect and group people in your photos
					</p>
					<button
						type="button"
						onClick={buildFaceIndex}
						disabled={building}
						className="btn btn-primary mt-4"
					>
						<UserPlus className="w-4 h-4" />
						Build Face Index
					</button>
				</div>
			) : (
				<div className="clusters-grid">
					{clusters.map((cluster) => (
						<FaceClusterCard key={cluster.id} cluster={cluster} />
					))}
				</div>
			)}

			<style>{`
        .face-detection {
          padding: 2rem;
          height: 100%;
          overflow-y: auto;
        }

        .detection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .clusters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .face-cluster-card {
          background: var(--bg-elevated);
          border: 2px solid transparent;
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          transition: all 0.3s;
        }

        .face-cluster-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .face-cluster-card.selected {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-light);
        }

        .face-cluster-button {
          width: 100%;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }

        .cluster-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .cluster-name {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .name-editor {
          display: flex;
          gap: 0.5rem;
          width: 100%;
        }

        .name-input {
          flex: 1;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          background: var(--bg-primary);
          font-size: 1rem;
        }

        .cluster-stats {
          margin-bottom: 1rem;
        }

        .face-examples {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }

        .face-thumbnail {
          aspect-ratio: 1;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--bg-tertiary);
        }

        .face-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .btn-icon {
          padding: 0.5rem;
          background: var(--bg-tertiary);
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--accent-light);
          color: var(--accent-primary);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          text-align: center;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 400px;
          gap: 1rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
		</div>
	);
}
