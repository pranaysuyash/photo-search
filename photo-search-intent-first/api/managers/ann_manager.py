"""
ANN (Approximate Nearest Neighbor) Manager - Manages multiple ANN index implementations.
Extracts ANN complexity from IndexStore for better separation of concerns.
"""

from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import logging
from pathlib import Path
import json
import time
from enum import Enum

logger = logging.getLogger(__name__)


class ANNIndexType(str, Enum):
    """Supported ANN index types."""
    HNSW = "hnsw"
    FAISS = "faiss"
    ANNOY = "annoy"
    BRUTE_FORCE = "brute"


class IndexStatus(str, Enum):
    """Status of an ANN index."""
    NOT_BUILT = "not_built"
    BUILDING = "building"
    READY = "ready"
    ERROR = "error"
    OUTDATED = "outdated"


class ANNManager:
    """Manages ANN index creation, loading, and searching operations."""

    def __init__(self, index_dir: Path):
        self.index_dir = Path(index_dir)
        self.index_dir.mkdir(parents=True, exist_ok=True)

        self.indexes: Dict[str, Dict[str, Any]] = {}
        self.logger = logging.getLogger(__name__)

        # Initialize ANN libraries conditionally
        self._initialize_ann_libraries()

    def _initialize_ann_libraries(self):
        """Initialize available ANN libraries."""
        self.available_libraries = {
            'hnswlib': False,
            'faiss': False,
            'annoy': False
        }

        try:
            import hnswlib
            self.available_libraries['hnswlib'] = True
            self.logger.info("HNSW library available")
        except ImportError:
            self.logger.info("HNSW library not available")

        try:
            import faiss
            self.available_libraries['faiss'] = True
            self.logger.info("FAISS library available")
        except ImportError:
            self.logger.info("FAISS library not available")

        try:
            from annoy import AnnoyIndex
            self.available_libraries['annoy'] = True
            self.logger.info("Annoy library available")
        except ImportError:
            self.logger.info("Annoy library not available")

    def get_available_index_types(self) -> List[ANNIndexType]:
        """Get list of available ANN index types based on installed libraries."""
        available = []

        if self.available_libraries['hnswlib']:
            available.append(ANNIndexType.HNSW)
        if self.available_libraries['faiss']:
            available.append(ANNIndexType.FAISS)
        if self.available_libraries['annoy']:
            available.append(ANNIndexType.ANNOY)

        # Brute force is always available as fallback
        available.append(ANNIndexType.BRUTE_FORCE)

        return available

    def create_index(self,
                    index_type: ANNIndexType,
                    dimension: int,
                    index_id: str,
                    **kwargs) -> Dict[str, Any]:
        """
        Create a new ANN index of the specified type.

        Args:
            index_type: Type of ANN index to create
            dimension: Dimension of the embedding vectors
            index_id: Unique identifier for this index
            **kwargs: Additional parameters specific to index type

        Returns:
            Dictionary containing index information
        """
        if index_type == ANNIndexType.HNSW and not self.available_libraries['hnswlib']:
            raise ValueError("HNSW library not available")
        if index_type == ANNIndexType.FAISS and not self.available_libraries['faiss']:
            raise ValueError("FAISS library not available")
        if index_type == ANNIndexType.ANNOY and not self.available_libraries['annoy']:
            raise ValueError("Annoy library not available")

        index_info = {
            'type': index_type,
            'id': index_id,
            'dimension': dimension,
            'status': IndexStatus.BUILDING,
            'created_at': time.time(),
            'parameters': kwargs
        }

        if index_type == ANNIndexType.HNSW:
            index_info['index'] = self._create_hnsw_index(dimension, **kwargs)
        elif index_type == ANNIndexType.FAISS:
            index_info['index'] = self._create_faiss_index(dimension, **kwargs)
        elif index_type == ANNIndexType.ANNOY:
            index_info['index'] = self._create_annoy_index(dimension, **kwargs)
        elif index_type == ANNIndexType.BRUTE_FORCE:
            index_info['index'] = self._create_brute_force_index(dimension, **kwargs)

        self.indexes[index_id] = index_info
        self.logger.info(f"Created {index_type.value} index '{index_id}' with dimension {dimension}")

        return index_info

    def _create_hnsw_index(self, dimension: int, **kwargs) -> Any:
        """Create an HNSW index."""
        import hnswlib

        max_elements = kwargs.get('max_elements', 10000)
        ef_construction = kwargs.get('ef_construction', 200)
        M = kwargs.get('M', 16)

        index = hnswlib.Index(space='cosine', dim=dimension)
        index.init_index(max_elements=max_elements, ef_construction=ef_construction, M=M)

        return index

    def _create_faiss_index(self, dimension: int, **kwargs) -> Any:
        """Create a FAISS index."""
        import faiss

        nlist = kwargs.get('nlist', 100)
        quantizer = faiss.IndexFlatIP(dimension)  # Inner product (cosine similarity)
        index = faiss.IndexIVFFlat(quantizer, dimension, nlist)

        return index

    def _create_annoy_index(self, dimension: int, **kwargs) -> Any:
        """Create an Annoy index."""
        from annoy import AnnoyIndex

        n_trees = kwargs.get('n_trees', 10)

        index = AnnoyIndex(dimension, 'angular')  # Angular distance for cosine similarity

        return {
            'index': index,
            'n_trees': n_trees,
            'built': False
        }

    def _create_brute_force_index(self, dimension: int, **kwargs) -> Any:
        """Create a brute force index (numpy array)."""
        return {
            'vectors': [],
            'dimension': dimension
        }

    def add_items(self, index_id: str, vectors: np.ndarray, ids: Optional[List[int]] = None):
        """
        Add vectors to an existing index.

        Args:
            index_id: ID of the index to add to
            vectors: Numpy array of vectors to add
            ids: Optional list of IDs for the vectors
        """
        if index_id not in self.indexes:
            raise ValueError(f"Index '{index_id}' not found")

        index_info = self.indexes[index_id]
        index_type = index_info['type']

        if index_type == ANNIndexType.HNSW:
            self._add_hnsw_items(index_info, vectors, ids)
        elif index_type == ANNIndexType.FAISS:
            self._add_faiss_items(index_info, vectors, ids)
        elif index_type == ANNIndexType.ANNOY:
            self._add_annoy_items(index_info, vectors, ids)
        elif index_type == ANNIndexType.BRUTE_FORCE:
            self._add_brute_force_items(index_info, vectors, ids)

        self.logger.info(f"Added {len(vectors)} vectors to index '{index_id}'")

    def _add_hnsw_items(self, index_info: Dict[str, Any], vectors: np.ndarray, ids: Optional[List[int]] = None):
        """Add items to HNSW index."""
        index = index_info['index']

        if ids is None:
            ids = list(range(index_info.get('current_size', 0), index_info.get('current_size', 0) + len(vectors)))

        index.add_items(vectors, ids)
        index_info['current_size'] = index.get_current_count()

    def _add_faiss_items(self, index_info: Dict[str, Any], vectors: np.ndarray, ids: Optional[List[int]] = None):
        """Add items to FAISS index."""
        index = index_info['index']
        # FAISS requires training before adding items
        if not index_info.get('trained', False):
            if len(vectors) >= index.nlist:
                index.train(vectors)
                index_info['trained'] = True
            else:
                # Not enough vectors to train, store for later
                if 'pending_vectors' not in index_info:
                    index_info['pending_vectors'] = []
                    index_info['pending_ids'] = []
                index_info['pending_vectors'].append(vectors)
                index_info['pending_ids'].append(ids or list(range(len(vectors))))
                return

        # Add any pending vectors
        if 'pending_vectors' in index_info:
            for pending_vectors, pending_ids in zip(index_info['pending_vectors'], index_info['pending_ids']):
                index.add_with_ids(pending_vectors, np.array(pending_ids))
            del index_info['pending_vectors']
            del index_info['pending_ids']

        # Add current vectors
        if ids is None:
            ids = list(range(index.ntotal, index.ntotal + len(vectors)))
        index.add_with_ids(vectors, np.array(ids))

    def _add_annoy_items(self, index_info: Dict[str, Any], vectors: np.ndarray, ids: Optional[List[int]] = None):
        """Add items to Annoy index."""
        annoy_data = index_info['index']
        index = annoy_data['index']

        if ids is None:
            ids = list(range(index_info.get('current_size', 0), index_info.get('current_size', 0) + len(vectors)))

        for i, (vector, vector_id) in enumerate(zip(vectors, ids)):
            index.add_item(vector_id, vector)

        index_info['current_size'] = len(ids)

    def _add_brute_force_items(self, index_info: Dict[str, Any], vectors: np.ndarray, ids: Optional[List[int]] = None):
        """Add items to brute force index."""
        if ids is None:
            ids = list(range(index_info.get('current_size', 0), index_info.get('current_size', 0) + len(vectors)))

        index_data = index_info['index']
        index_data['vectors'].extend(vectors.tolist())
        index_info['current_size'] = len(index_data['vectors'])

    def build_index(self, index_id: str) -> bool:
        """
        Build/finalize an index after all items have been added.

        Args:
            index_id: ID of the index to build

        Returns:
            True if build was successful
        """
        if index_id not in self.indexes:
            raise ValueError(f"Index '{index_id}' not found")

        index_info = self.indexes[index_id]
        index_type = index_info['type']

        try:
            if index_type == ANNIndexType.HNSW:
                # HNSW doesn't need explicit building
                pass
            elif index_type == ANNIndexType.FAISS:
                # FAISS was built during add_items
                pass
            elif index_type == ANNIndexType.ANNOY:
                annoy_data = index_info['index']
                annoy_data['index'].build(annoy_data['n_trees'])
                annoy_data['built'] = True
            elif index_type == ANNIndexType.BRUTE_FORCE:
                # Brute force doesn't need building
                pass

            index_info['status'] = IndexStatus.READY
            index_info['built_at'] = time.time()
            self.logger.info(f"Built index '{index_id}'")

            return True

        except Exception as e:
            index_info['status'] = IndexStatus.ERROR
            index_info['error'] = str(e)
            self.logger.error(f"Failed to build index '{index_id}': {e}")
            return False

    def search(self,
               index_id: str,
               query_vector: np.ndarray,
               k: int = 10,
               **kwargs) -> List[Tuple[int, float]]:
        """
        Search for similar vectors in an index.

        Args:
            index_id: ID of the index to search
            query_vector: Query vector
            k: Number of results to return
            **kwargs: Additional search parameters

        Returns:
            List of (id, distance) tuples
        """
        if index_id not in self.indexes:
            raise ValueError(f"Index '{index_id}' not found")

        index_info = self.indexes[index_id]

        if index_info['status'] != IndexStatus.READY:
            raise ValueError(f"Index '{index_id}' is not ready for searching")

        index_type = index_info['type']

        if index_type == ANNIndexType.HNSW:
            return self._search_hnsw(index_info, query_vector, k, **kwargs)
        elif index_type == ANNIndexType.FAISS:
            return self._search_faiss(index_info, query_vector, k, **kwargs)
        elif index_type == ANNIndexType.ANNOY:
            return self._search_annoy(index_info, query_vector, k, **kwargs)
        elif index_type == ANNIndexType.BRUTE_FORCE:
            return self._search_brute_force(index_info, query_vector, k, **kwargs)

        raise ValueError(f"Unknown index type: {index_type}")

    def _search_hnsw(self, index_info: Dict[str, Any], query_vector: np.ndarray, k: int, **kwargs) -> List[Tuple[int, float]]:
        """Search HNSW index."""
        index = index_info['index']
        ef_search = kwargs.get('ef_search', 100)

        index.set_ef(ef_search)
        ids, distances = index.knn_query(query_vector, k=k)

        # Convert distances to similarities (cosine)
        similarities = [1.0 - float(d) for d in distances[0]]

        return list(zip(ids[0], similarities))

    def _search_faiss(self, index_info: Dict[str, Any], query_vector: np.ndarray, k: int, **kwargs) -> List[Tuple[int, float]]:
        """Search FAISS index."""
        index = index_info['index']
        query_vector = query_vector.reshape(1, -1).astype('float32')

        distances, ids = index.search(query_vector, k)

        # Convert to list of tuples
        results = []
        for i in range(len(ids[0])):
            if ids[0][i] >= 0:  # Valid ID
                # Convert inner product to cosine similarity
                similarity = float(distances[0][i])
                results.append((int(ids[0][i]), similarity))

        return results

    def _search_annoy(self, index_info: Dict[str, Any], query_vector: np.ndarray, k: int, **kwargs) -> List[Tuple[int, float]]:
        """Search Annoy index."""
        annoy_data = index_info['index']
        index = annoy_data['index']

        if not annoy_data['built']:
            raise ValueError("Annoy index not built")

        ids = index.get_nns_by_vector(query_vector, k, include_distances=True)

        # Convert distances to similarities
        results = []
        for id_idx, distance in zip(ids[0], ids[1]):
            # Angular distance to cosine similarity
            similarity = 1.0 - (distance ** 2) / 2.0
            results.append((id_idx, similarity))

        return results

    def _search_brute_force(self, index_info: Dict[str, Any], query_vector: np.ndarray, k: int, **kwargs) -> List[Tuple[int, float]]:
        """Search brute force index."""
        index_data = index_info['index']
        vectors = np.array(index_data['vectors'])

        # Compute cosine similarities
        similarities = np.dot(vectors, query_vector)

        # Get top-k results
        top_k_indices = np.argsort(similarities)[::-1][:k]

        return [(idx, float(similarities[idx])) for idx in top_k_indices]

    def save_index(self, index_id: str, filepath: Optional[Path] = None):
        """
        Save an index to disk.

        Args:
            index_id: ID of the index to save
            filepath: Optional custom filepath
        """
        if index_id not in self.indexes:
            raise ValueError(f"Index '{index_id}' not found")

        if filepath is None:
            filepath = self.index_dir / f"{index_id}_{self.indexes[index_id]['type']}.ann"

        index_info = self.indexes[index_id]
        index_type = index_info['type']

        try:
            if index_type == ANNIndexType.HNSW:
                self._save_hnsw_index(index_info, filepath)
            elif index_type == ANNIndexType.FAISS:
                self._save_faiss_index(index_info, filepath)
            elif index_type == ANNIndexType.ANNOY:
                self._save_annoy_index(index_info, filepath)
            elif index_type == ANNIndexType.BRUTE_FORCE:
                self._save_brute_force_index(index_info, filepath)

            self.logger.info(f"Saved index '{index_id}' to {filepath}")

        except Exception as e:
            self.logger.error(f"Failed to save index '{index_id}': {e}")
            raise

    def _save_hnsw_index(self, index_info: Dict[str, Any], filepath: Path):
        """Save HNSW index."""
        index = index_info['index']
        index.save_index(str(filepath))

        # Save metadata
        metadata = {
            'type': 'hnsw',
            'dimension': index_info['dimension'],
            'current_size': index_info['current_size'],
            'parameters': index_info['parameters']
        }

        with open(filepath.with_suffix('.json'), 'w') as f:
            json.dump(metadata, f)

    def _save_faiss_index(self, index_info: Dict[str, Any], filepath: Path):
        """Save FAISS index."""
        import faiss

        index = index_info['index']
        faiss.write_index(index, str(filepath))

    def _save_annoy_index(self, index_info: Dict[str, Any], filepath: Path):
        """Save Annoy index."""
        annoy_data = index_info['index']
        index = annoy_data['index']

        index.save(str(filepath))

    def _save_brute_force_index(self, index_info: Dict[str, Any], filepath: Path):
        """Save brute force index."""
        index_data = index_info['index']

        data = {
            'vectors': index_data['vectors'],
            'dimension': index_data['dimension']
        }

        import pickle
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)

    def load_index(self, index_id: str, filepath: Path) -> bool:
        """
        Load an index from disk.

        Args:
            index_id: ID to assign to loaded index
            filepath: Path to the index file

        Returns:
            True if load was successful
        """
        try:
            # Try to determine index type from file
            if filepath.suffix == '.json':
                # Metadata file for HNSW
                with open(filepath, 'r') as f:
                    metadata = json.load(f)
                index_type = ANNIndexType(metadata['type'])
                actual_filepath = filepath.with_suffix('.ann')
            else:
                # Assume based on filename patterns
                if 'hnsw' in str(filepath).lower():
                    index_type = ANNIndexType.HNSW
                elif 'faiss' in str(filepath).lower():
                    index_type = ANNIndexType.FAISS
                elif 'annoy' in str(filepath).lower():
                    index_type = ANNIndexType.ANNOY
                else:
                    # Default to brute force
                    index_type = ANNIndexType.BRUTE_FORCE
                actual_filepath = filepath

            # Load the index
            if index_type == ANNIndexType.HNSW:
                loaded_index = self._load_hnsw_index(actual_filepath)
            elif index_type == ANNIndexType.FAISS:
                loaded_index = self._load_faiss_index(actual_filepath)
            elif index_type == ANNIndexType.ANNOY:
                loaded_index = self._load_annoy_index(actual_filepath)
            elif index_type == ANNIndexType.BRUTE_FORCE:
                loaded_index = self._load_brute_force_index(actual_filepath)

            self.indexes[index_id] = {
                'type': index_type,
                'id': index_id,
                'index': loaded_index,
                'status': IndexStatus.READY,
                'loaded_at': time.time()
            }

            self.logger.info(f"Loaded index '{index_id}' from {filepath}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to load index from {filepath}: {e}")
            return False

    def _load_hnsw_index(self, filepath: Path) -> Any:
        """Load HNSW index."""
        import hnswlib

        index = hnswlib.Index(space='cosine', dim=768)  # Will be resized
        index.load_index(str(filepath))

        return index

    def _load_faiss_index(self, filepath: Path) -> Any:
        """Load FAISS index."""
        import faiss

        return faiss.read_index(str(filepath))

    def _load_annoy_index(self, filepath: Path) -> Any:
        """Load Annoy index."""
        from annoy import AnnoyIndex

        # Need to know dimension, will be handled by caller
        return None  # Placeholder

    def _load_brute_force_index(self, filepath: Path) -> Any:
        """Load brute force index."""
        import pickle

        with open(filepath, 'rb') as f:
            return pickle.load(f)

    def get_index_info(self, index_id: str) -> Optional[Dict[str, Any]]:
        """Get information about an index."""
        return self.indexes.get(index_id)

    def list_indexes(self) -> List[str]:
        """List all available index IDs."""
        return list(self.indexes.keys())

    def delete_index(self, index_id: str) -> bool:
        """Delete an index."""
        if index_id in self.indexes:
            del self.indexes[index_id]
            self.logger.info(f"Deleted index '{index_id}'")
            return True
        return False

    def get_index_statistics(self, index_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed statistics about an index."""
        if index_id not in self.indexes:
            return None

        index_info = self.indexes[index_id]
        stats = {
            'id': index_id,
            'type': index_info['type'].value,
            'status': index_info['status'].value,
            'dimension': index_info['dimension'],
            'created_at': index_info.get('created_at'),
            'built_at': index_info.get('built_at'),
            'loaded_at': index_info.get('loaded_at')
        }

        # Add type-specific statistics
        if index_info['type'] == ANNIndexType.HNSW:
            index = index_info['index']
            stats.update({
                'current_size': index.get_current_count(),
                'max_elements': index.get_max_elements()
            })
        elif index_info['type'] == ANNIndexType.FAISS:
            index = index_info['index']
            stats.update({
                'current_size': index.ntotal,
                'nlist': index.nlist
            })
        elif index_info['type'] == ANNIndexType.ANNOY:
            annoy_data = index_info['index']
            stats.update({
                'current_size': index_info.get('current_size', 0),
                'n_trees': annoy_data['n_trees'],
                'built': annoy_data['built']
            })
        elif index_info['type'] == ANNIndexType.BRUTE_FORCE:
            index_data = index_info['index']
            stats.update({
                'current_size': len(index_data['vectors'])
            })

        return stats