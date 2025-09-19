#!/usr/bin/env python3
"""
Offline Provider Verification Script

Tests that embedding providers work offline when models are pre-cached locally.
This script verifies the offline-first functionality of the photo search providers.

Usage:
    python offline_provider_test.py [--model-dir PATH] [--provider local|hf|openai]

Requirements:
    - Models must be pre-downloaded to the specified model directory
    - OFFLINE_MODE=1 environment variable should be set
    - For HuggingFace provider: HF_HUB_OFFLINE=1 and local models
    - For OpenAI provider: API key and offline mode handling
"""

import os
import sys
import argparse
import tempfile
from pathlib import Path
import numpy as np
from PIL import Image

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

from adapters.embedding_transformers_clip import TransformersClipEmbedding
from adapters.embedding_clip import ClipEmbedding
from domain.models import Photo


def create_test_image(width=224, height=224, color=(255, 0, 0)):
    """Create a simple test image for embedding."""
    img = Image.new('RGB', (width, height), color=color)
    return img


def test_transformers_provider_offline(model_dir=None, verbose=False):
    """Test Transformers CLIP provider in offline mode."""
    print("Testing Transformers CLIP provider offline...")

    # Set offline environment
    os.environ['OFFLINE_MODE'] = '1'
    os.environ['TRANSFORMERS_OFFLINE'] = '1'
    os.environ['HF_HUB_OFFLINE'] = '1'

    if model_dir:
        os.environ['PHOTOVAULT_MODEL_DIR'] = str(model_dir)
        os.environ['TRANSFORMERS_CACHE'] = str(model_dir)

    try:
        # Initialize provider
        provider = TransformersClipEmbedding()
        print("✓ Provider initialized successfully")

        # Create test images
        test_images = []
        for i, color in enumerate([(255, 0, 0), (0, 255, 0), (0, 0, 255)]):
            img = create_test_image(color=color)
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
                img.save(f.name)
                test_images.append(Path(f.name))

        # Create Photo objects
        photos = [Photo(path=p, mtime=p.stat().st_mtime) for p in test_images]

        # Test embedding generation
        embeddings = provider.embed_images([p.path for p in photos])
        print(f"✓ Generated embeddings for {len(photos)} images")
        print(f"  Embedding shape: {embeddings.shape}")
        print(f"  Embedding dtype: {embeddings.dtype}")

        # Test text embedding
        text_emb = provider.embed_text("a red test image")
        print(f"✓ Generated text embedding, shape: {text_emb.shape}")

        # Verify embeddings are reasonable
        assert embeddings.shape[0] == len(photos), "Wrong number of embeddings"
        assert embeddings.shape[1] > 0, "Embeddings should have positive dimension"
        assert not np.allclose(embeddings[0], embeddings[1]), "Different images should have different embeddings"

        print("✓ Transformers provider offline test PASSED")

        # Cleanup
        for p in test_images:
            p.unlink(missing_ok=True)

        return True

    except Exception as e:
        print(f"✗ Transformers provider offline test FAILED: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        return False
    finally:
        # Clean up environment
        for key in ['OFFLINE_MODE', 'TRANSFORMERS_OFFLINE', 'HF_HUB_OFFLINE', 'PHOTOVAULT_MODEL_DIR', 'TRANSFORMERS_CACHE']:
            os.environ.pop(key, None)


def test_sentence_transformers_provider_offline(model_dir=None, verbose=False):
    """Test SentenceTransformers CLIP provider in offline mode."""
    print("Testing SentenceTransformers CLIP provider offline...")

    # Set offline environment
    os.environ['OFFLINE_MODE'] = '1'
    os.environ['SENTENCE_TRANSFORMERS_HOME'] = str(model_dir) if model_dir else '/tmp/models'

    if model_dir:
        os.environ['PHOTOVAULT_MODEL_DIR'] = str(model_dir)

    try:
        # Initialize provider
        provider = ClipEmbedding()
        print("✓ Provider initialized successfully")

        # Create test images
        test_images = []
        for i, color in enumerate([(255, 0, 0), (0, 255, 0), (0, 0, 255)]):
            img = create_test_image(color=color)
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
                img.save(f.name)
                test_images.append(Path(f.name))

        # Create Photo objects
        photos = [Photo(path=p, mtime=p.stat().st_mtime) for p in test_images]

        # Test embedding generation
        embeddings = provider.embed_images([p.path for p in photos])
        print(f"✓ Generated embeddings for {len(photos)} images")
        print(f"  Embedding shape: {embeddings.shape}")
        print(f"  Embedding dtype: {embeddings.dtype}")

        # Test text embedding
        text_emb = provider.embed_text("a red test image")
        print(f"✓ Generated text embedding, shape: {text_emb.shape}")

        # Verify embeddings are reasonable
        assert embeddings.shape[0] == len(photos), "Wrong number of embeddings"
        assert embeddings.shape[1] > 0, "Embeddings should have positive dimension"
        assert not np.allclose(embeddings[0], embeddings[1]), "Different images should have different embeddings"

        print("✓ SentenceTransformers provider offline test PASSED")

        # Cleanup
        for p in test_images:
            p.unlink(missing_ok=True)

        return True

    except Exception as e:
        print(f"✗ SentenceTransformers provider offline test FAILED: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        return False
    finally:
        # Clean up environment
        for key in ['OFFLINE_MODE', 'SENTENCE_TRANSFORMERS_HOME', 'PHOTOVAULT_MODEL_DIR']:
            os.environ.pop(key, None)


def main():
    parser = argparse.ArgumentParser(description='Test embedding providers in offline mode')
    parser.add_argument('--model-dir', type=Path, help='Directory containing pre-downloaded models')
    parser.add_argument('--provider', choices=['transformers', 'sentence-transformers', 'all'],
                       default='all', help='Which provider to test')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose error output')

    args = parser.parse_args()

    print("Offline Provider Verification")
    print("=" * 40)

    if args.model_dir and not args.model_dir.exists():
        print(f"Warning: Model directory {args.model_dir} does not exist")

    results = []

    if args.provider in ['transformers', 'all']:
        results.append(test_transformers_provider_offline(args.model_dir, args.verbose))
        print()

    if args.provider in ['sentence-transformers', 'all']:
        results.append(test_sentence_transformers_provider_offline(args.model_dir, args.verbose))
        print()

    # Summary
    passed = sum(results)
    total = len(results)

    print("Summary:")
    print(f"  Tests passed: {passed}/{total}")

    if passed == total:
        print("✓ All offline provider tests PASSED")
        return 0
    else:
        print("✗ Some offline provider tests FAILED")
        return 1


if __name__ == '__main__':
    sys.exit(main())
