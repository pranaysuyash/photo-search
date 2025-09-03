#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from usecases.index_photos import index_photos
from usecases.search_photos import search_photos


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

    args = parser.parse_args()
    folder = Path(args.dir).expanduser().resolve()

    if args.cmd == "index":
        new_c, upd_c, total = index_photos(folder, batch_size=args.batch_size, provider=args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
        print(f"Index complete. New: {new_c}, Updated: {upd_c}, Total: {total}")
    elif args.cmd == "search":
        results = search_photos(folder, args.query, top_k=args.top_k, provider=args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
        for p in results:
            print(f"{p.score:.3f}\t{p.path}")


if __name__ == "__main__":
    main()

