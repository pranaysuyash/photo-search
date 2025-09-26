#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from usecases.index_photos import index_photos
from usecases.search_photos import search_photos
from infra.fast_index import FastIndexManager
from infra.index_store import IndexStore


def main():
    parser = argparse.ArgumentParser(description="Photo Search – Intent-First CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_index = sub.add_parser("index", help="Build or update index for a folder")
    p_index.add_argument("--dir", required=True, help="Photo directory")
    p_index.add_argument("--batch-size", type=int, default=32)
    p_index.add_argument("--provider", default="local", choices=["local", "hf", "openai"])
    p_index.add_argument("--hf-token", default=None)
    p_index.add_argument("--openai-api-key", default=None)

    p_search = sub.add_parser("search", help="Search a folder's index")
    p_search.add_argument("--dir", required=True, help="Photo directory")
    p_search.add_argument("--query", required=True)
    p_search.add_argument("--top-k", type=int, default=12)
    p_search.add_argument("--provider", default="local", choices=["local", "hf", "openai"])
    p_search.add_argument("--hf-token", default=None)
    p_search.add_argument("--openai-api-key", default=None)

    # Fast index commands group
    p_fast = sub.add_parser("fast", help="Manage fast ANN indexes (faiss|hnsw|annoy)")
    fast_sub = p_fast.add_subparsers(dest="fast_cmd", required=True)

    p_fast_build = fast_sub.add_parser("build", help="Build a fast index for a folder")
    p_fast_build.add_argument("--dir", required=True)
    p_fast_build.add_argument("--kind", required=True, choices=["faiss", "hnsw", "annoy"], help="Backend kind")
    p_fast_build.add_argument("--provider", default="local")
    p_fast_build.add_argument("--hf-token", default=None)
    p_fast_build.add_argument("--openai-api-key", default=None)

    p_fast_status = fast_sub.add_parser("status", help="Show fast index status for a folder")
    p_fast_status.add_argument("--dir", required=True)
    p_fast_status.add_argument("--provider", default="local")
    p_fast_status.add_argument("--hf-token", default=None)
    p_fast_status.add_argument("--openai-api-key", default=None)

    args = parser.parse_args()
    folder = Path(args.dir).expanduser().resolve()

    if args.cmd == "index":
        new_c, upd_c, total = index_photos(folder, batch_size=args.batch_size, provider=args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
        print(f"Index complete. New: {new_c}, Updated: {upd_c}, Total: {total}")
    elif args.cmd == "search":
        results = search_photos(folder, args.query, top_k=args.top_k, provider=args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
        for p in results:
            print(f"{p.score:.3f}\t{p.path}")
    elif args.cmd == "fast":
        if args.fast_cmd == "build":
            # Need to create the embedder with the specified provider to ensure
            # consistency with the index embeddings
            from adapters.provider_factory import get_provider
            embedder = get_provider(args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
            store = IndexStore(folder, index_key=getattr(embedder, 'index_id', None))
            fim = FastIndexManager(store)
            ok = fim.build(args.kind)
            print(f"Build {args.kind}: {'ok' if ok else 'skipped'}")
        elif args.fast_cmd == "status":
            # For status, we need to create the store with the correct index_key based on provider
            from adapters.provider_factory import get_provider
            embedder = get_provider(args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
            store = IndexStore(folder, index_key=getattr(embedder, 'index_id', None))
            fim = FastIndexManager(store)
            st = fim.status()
            import json as _json
            print(_json.dumps(st, indent=2))


if __name__ == "__main__":
    main()

