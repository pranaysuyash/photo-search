#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from usecases.index_photos import index_photos
from usecases.search_photos import search_photos
from infra.fast_index import FastIndexManager
from infra.storage_factory import create_index_store, initialize_storage_sync


def main():
    parser = argparse.ArgumentParser(description="Photo Search – Intent-First CLI")
    parser.add_argument("--offline", action="store_true", help="Enable offline mode (use local models only)")
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

    # Database management commands
    p_db = sub.add_parser("db", help="SQLite database management")
    db_sub = p_db.add_subparsers(dest="db_cmd", required=True)

    p_db_init = db_sub.add_parser("init", help="Initialize SQLite database for a folder")
    p_db_init.add_argument("--dir", required=True, help="Photo directory")
    p_db_init.add_argument("--backend", default="sqlite", choices=["sqlite"], help="Storage backend")

    p_db_migrate = db_sub.add_parser("migrate", help="Migrate storage backend")
    p_db_migrate.add_argument("--dir", required=True, help="Photo directory")
    p_db_migrate.add_argument("--from-backend", default="file", choices=["file"], help="Source backend")
    p_db_migrate.add_argument("--to-backend", default="sqlite", choices=["sqlite"], help="Target backend")

    p_db_stats = db_sub.add_parser("stats", help="Show database statistics")
    p_db_stats.add_argument("--dir", required=True, help="Photo directory")
    p_db_stats.add_argument("--backend", default="sqlite", choices=["file", "sqlite"], help="Storage backend")

    p_db_backup = db_sub.add_parser("backup", help="Backup database")
    p_db_backup.add_argument("--dir", required=True, help="Photo directory")
    p_db_backup.add_argument("--output", required=True, help="Backup file path")

    p_db_restore = db_sub.add_parser("restore", help="Restore database from backup")
    p_db_restore.add_argument("--dir", required=True, help="Photo directory")
    p_db_restore.add_argument("--input", required=True, help="Backup file path")

    args = parser.parse_args()
    
    # Set offline mode if requested
    if getattr(args, 'offline', False):
        from api.runtime_flags import set_offline
        set_offline(True)
    
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
            store = create_index_store(folder, index_key=getattr(embedder, 'index_id', None))
            initialize_storage_sync(store)
            fim = FastIndexManager(store)
            ok = fim.build(args.kind)
            print(f"Build {args.kind}: {'ok' if ok else 'skipped'}")
        elif args.fast_cmd == "status":
            # For status, we need to create the store with the correct index_key based on provider
            from adapters.provider_factory import get_provider
            embedder = get_provider(args.provider, hf_token=args.hf_token, openai_api_key=args.openai_api_key)
            store = create_index_store(folder, index_key=getattr(embedder, 'index_id', None))
            initialize_storage_sync(store)
            fim = FastIndexManager(store)
            st = fim.status()
            import json as _json
            print(_json.dumps(st, indent=2))
    elif args.cmd == "db":
        asyncio.run(handle_db_command(args))


async def handle_db_command(args):
    """Handle database management commands."""
    from infra.storage_factory import create_index_store
    from infra.migration import StorageMigrator
    import json

    folder = Path(args.dir).expanduser().resolve()

    if args.db_cmd == "init":
        print(f"Initializing {args.backend} database for {folder}")
        store = create_index_store(folder)
        if hasattr(store, 'initialize'):
            await store.initialize()
        print("Database initialized successfully")

    elif args.db_cmd == "migrate":
        print(f"Migrating from {args.from_backend} to {args.to_backend} for {folder}")

        if args.from_backend == "file" and args.to_backend == "sqlite":
            # Migrate file to SQLite
            sqlite_store = create_index_store(folder)
            migrator = StorageMigrator(folder)
            stats = await migrator.migrate_file_to_sqlite(sqlite_store)
            print(f"Migration completed: {json.dumps(stats, indent=2)}")

        else:
            print(f"Migration from {args.from_backend} to {args.to_backend} not supported yet")

    elif args.db_cmd == "stats":
        print(f"Getting {args.backend} statistics for {folder}")
        store = create_index_store(folder)
        if hasattr(store, 'get_stats'):
            stats = await store.get_stats()
        else:
            # File-based store stats
            store.load()
            photo_count = len(store.state.paths) if store.state.paths else 0
            embedding_count = store.state.embeddings.shape[0] if store.state.embeddings is not None else 0
            stats = {
                'photo_count': photo_count,
                'embedding_count': embedding_count,
                'storage_type': 'file'
            }
        print(json.dumps(stats, indent=2))

    elif args.db_cmd == "backup":
        print(f"Backing up database from {folder} to {args.output}")
        # For SQLite, just copy the database file
        store = create_index_store(folder)
        if hasattr(store, 'db_path'):
            import shutil
            shutil.copy2(store.db_path, args.output)
            print("Backup completed")
        else:
            print("Backup not supported for file-based storage")

    elif args.db_cmd == "restore":
        print(f"Restoring database from {args.input} to {folder}")
        # For SQLite, copy the backup file
        store = create_index_store(folder)
        if hasattr(store, 'db_path'):
            import shutil
            store.db_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(args.input, store.db_path)
            print("Restore completed")
        else:
            print("Restore not supported for file-based storage")


if __name__ == "__main__":
    main()

