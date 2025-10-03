# SQLite Storage Backend

The photo-search Intent-First backend supports SQLite as an alternative storage backend to the default file-based storage. SQLite provides structured storage with SQL querying capabilities, better performance for large collections, and enhanced data management features.

## Overview

The SQLite backend stores photo metadata, embeddings, thumbnails, and related data in a structured database instead of JSON/NumPy files. This provides several advantages:

- **Structured Queries**: SQL-based queries for complex searches and filtering
- **Better Performance**: Indexed queries for large photo collections
- **ACID Transactions**: Reliable data consistency and rollback capabilities
- **Concurrent Access**: Better support for multiple processes accessing the same data
- **Backup/Restore**: Easy database file backups and restores
- **Rich Metadata**: Support for tags, collections, and search history

## Configuration

Enable SQLite storage by setting the `STORAGE_BACKEND` environment variable:

```bash
export STORAGE_BACKEND=sqlite
```

The default remains `file` for backward compatibility.

## Database Schema

The SQLite database contains the following tables:

### photos

Core photo metadata:
- `id`: Primary key
- `path`: Absolute file path
- `relative_path`: Path relative to root directory
- `filename`: Just the filename
- `mtime`: File modification time
- `size`: File size in bytes
- `width`, `height`: Image dimensions
- `created_at`, `updated_at`: Timestamps

### thumbnails

Compressed image thumbnails:
- `photo_id`: Foreign key to photos
- `data`: BLOB containing compressed image data
- `format`: Image format (webp, jpeg, etc.)
- `width`, `height`: Thumbnail dimensions
- `size_bytes`: Size of compressed data

### embeddings

Vector embeddings for similarity search:
- `photo_id`: Foreign key to photos
- `vector`: BLOB containing numpy array
- `dimensions`: Vector dimensionality
- `model_name`: Name of embedding model used

### tags

Photo tags for organization:
- `id`: Primary key
- `name`: Tag name (unique)
- `created_at`: Creation timestamp

### photo_tags

Many-to-many relationship between photos and tags:
- `photo_id`: Foreign key to photos
- `tag_id`: Foreign key to tags
- `confidence`: Tag confidence score
- `created_at`: When tag was applied

### collections

Photo collections/groups:
- `id`: Primary key
- `name`: Collection name (unique)
- `description`: Optional description
- `created_at`: Creation timestamp

### photo_collections

Many-to-many relationship between photos and collections:
- `photo_id`: Foreign key to photos
- `collection_id`: Foreign key to collections
- `added_at`: When photo was added to collection

### search_history

Search query history and analytics:
- `id`: Primary key
- `query`: Search query text
- `results_count`: Number of results returned
- `search_time`: Search execution time
- `timestamp`: When search was performed

## CLI Commands

### Initialize Database

```bash
python cli.py db init --dir /path/to/photos --backend sqlite
```

### Migrate from File-based Storage

```bash
python cli.py db migrate --dir /path/to/photos --from-backend file --to-backend sqlite
```

### View Database Statistics
```bash
python cli.py db stats --dir /path/to/photos --backend sqlite
```

### Backup Database
```bash
python cli.py db backup --dir /path/to/photos --output backup.db
```

### Restore Database
```bash
python cli.py db restore --dir /path/to/photos --input backup.db
```

## Migration

The system supports bidirectional migration between file-based and SQLite storage:

### File to SQLite
```bash
python cli.py db migrate --dir /path/to/photos --from-backend file --to-backend sqlite
```

This process:
1. Creates SQLite database with proper schema
2. Reads existing JSON/NumPy files
3. Migrates photo metadata, embeddings, and thumbnails
4. Validates data integrity
5. Provides progress reporting

### SQLite to File
```bash
python cli.py db migrate --dir /path/to/photos --from-backend sqlite --to-backend file
```

This process:
1. Reads all data from SQLite database
2. Creates JSON/NumPy files in `.photo_index/` directory
3. Maintains data compatibility with file-based storage

## Performance Considerations

### Indexes
The database includes optimized indexes for common query patterns:
- Photo paths and modification times
- Embedding model names
- Tag and collection relationships
- Search history timestamps

### WAL Mode
SQLite uses Write-Ahead Logging (WAL) mode for better concurrency and performance.

### Connection Pooling
The async implementation uses connection pooling for efficient database access.

## API Integration

The storage backend is abstracted through the `storage_factory.py` module. All existing APIs work unchanged:

```python
from infra.storage_factory import create_index_store, initialize_storage_sync

# Automatically uses configured backend
store = create_index_store(folder, index_key=embedder.index_id)
initialize_storage_sync(store)

# Use normally
new_count, updated_count = store.upsert(embedder, photos)
results = store.search(embedder, query)
```

## Backup and Recovery

### Automated Backups
```bash
# Create timestamped backup
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).db"
python cli.py db backup --dir /path/to/photos --output "$BACKUP_FILE"
```

### Recovery
```bash
# Restore from backup
python cli.py db restore --dir /path/to/photos --input backup.db
```

### Integrity Checking
The migration utilities include data validation to ensure backup integrity.

## Troubleshooting

### Database Corruption
If the database becomes corrupted:
1. Restore from a recent backup
2. Rebuild the index from scratch if no backup exists

### Migration Issues
- Ensure sufficient disk space (database may be larger than JSON files)
- Check file permissions for database file access
- Verify no other processes are accessing the database during migration

### Performance Issues
- Run `ANALYZE` on the database to update query statistics
- Consider database file placement on fast storage
- Monitor database file size and implement cleanup if needed

## Future Enhancements

Potential future improvements:
- Full-text search capabilities
- Advanced query builders
- Photo clustering and deduplication
- Analytics and usage statistics
- Multi-user support with access controls