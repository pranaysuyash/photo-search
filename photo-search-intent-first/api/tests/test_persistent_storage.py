"""
Tests for the persistent storage functionality using SQLite database.
"""
import pytest
import tempfile
import os
from pathlib import Path

from api.database.local_db import LocalDatabase
from api.database.daos import (
    PhotoDAO, SearchHistoryDAO, ActivityLogDAO, 
    CollectionDAO, CachedSearchDAO
)
from api.database.manager import DatabaseManager


def test_database_creation():
    """Test that the database is created properly."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db = LocalDatabase(db_path)
        
        # Verify tables were created
        cursor = db.connection.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = {
            'photos', 'search_history', 'activity_log', 
            'collections', 'tags', 'photo_tags', 'cached_search_results'
        }
        assert expected_tables.issubset(set(tables))
        
        db.close()


def test_photo_dao():
    """Test PhotoDAO operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db = LocalDatabase(db_path)
        photo_dao = PhotoDAO(db)
        
        # Test upsert
        metadata = {
            'filename': 'test.jpg',
            'mtime': 1234567890.0,
            'size_bytes': 1024000,
            'width': 1920,
            'height': 1080
        }
        result = photo_dao.upsert_photo('/path/to/test.jpg', metadata)
        assert result is True
        
        # Test get
        photo = photo_dao.get_photo('/path/to/test.jpg')
        assert photo is not None
        assert photo['filename'] == 'test.jpg'
        assert photo['metadata']['mtime'] == 1234567890.0
        
        # Test update favorite
        result = photo_dao.update_favorite('/path/to/test.jpg', True)
        assert result is True
        
        # Verify favorite status updated
        updated_photo = photo_dao.get_photo('/path/to/test.jpg')
        assert updated_photo['favorite'] == 1
        
        db.close()


def test_search_history_dao():
    """Test SearchHistoryDAO operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db = LocalDatabase(db_path)
        search_history_dao = SearchHistoryDAO(db)
        
        # Add a search
        filters = {'tag': 'sunset', 'date_from': 1234567890}
        result = search_history_dao.add_search(
            query='sunset at beach',
            provider='local',
            top_k=10,
            filters=filters,
            result_count=5,
            search_time_ms=123.45,
            cached=False
        )
        assert result is True
        
        # Get recent searches
        searches = search_history_dao.get_recent_searches(limit=5)
        assert len(searches) >= 1
        latest_search = searches[0]
        assert latest_search['query'] == 'sunset at beach'
        assert latest_search['filters']['tag'] == 'sunset'
        
        db.close()


def test_activity_log_dao():
    """Test ActivityLogDAO operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db = LocalDatabase(db_path)
        activity_log_dao = ActivityLogDAO(db)
        
        # Log an activity
        result = activity_log_dao.log_activity(
            activity_type='view',
            path='/path/to/photo.jpg',
            query='test query',
            metadata={'action': 'click', 'source': 'results_grid'}
        )
        assert result is True
        
        # Get activities
        activities = activity_log_dao.get_activities(activity_type='view', limit=10)
        assert len(activities) >= 1
        activity = activities[0]
        assert activity['activity_type'] == 'view'
        assert activity['path'] == '/path/to/photo.jpg'
        assert activity['metadata']['action'] == 'click'
        
        db.close()


def test_collection_dao():
    """Test CollectionDAO operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db = LocalDatabase(db_path)
        collection_dao = CollectionDAO(db)
        
        # Create a collection
        result = collection_dao.create_collection(
            name='Test Collection',
            description='A test collection',
            photo_paths=['/path1.jpg', '/path2.jpg']
        )
        assert result is True
        
        # Get the collection
        collection = collection_dao.get_collection('Test Collection')
        assert collection is not None
        assert collection['name'] == 'Test Collection'
        assert collection['description'] == 'A test collection'
        assert collection['photo_paths'] == ['/path1.jpg', '/path2.jpg']
        
        # Add photos to collection
        result = collection_dao.add_photos_to_collection(
            'Test Collection',
            ['/path3.jpg', '/path4.jpg']
        )
        assert result is True
        
        # Verify photos were added
        updated_collection = collection_dao.get_collection('Test Collection')
        expected_paths = {'/path1.jpg', '/path2.jpg', '/path3.jpg', '/path4.jpg'}
        assert set(updated_collection['photo_paths']) == expected_paths
        
        db.close()


def test_cached_search_dao():
    """Test CachedSearchDAO operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db = LocalDatabase(db_path)
        cached_search_dao = CachedSearchDAO(db)
        
        # Cache search results
        results = [
            {'path': '/photo1.jpg', 'score': 0.95},
            {'path': '/photo2.jpg', 'score': 0.87}
        ]
        filters = {'tag': 'portrait', 'rating': 4}
        
        result = cached_search_dao.cache_search_results(
            cache_key='test_key',
            query='portrait photos',
            provider='local',
            top_k=10,
            filters=filters,
            results=results,
            ttl_seconds=3600  # 1 hour
        )
        assert result is True
        
        # Retrieve cached results
        cached_result = cached_search_dao.get_cached_results('test_key')
        assert cached_result is not None
        assert cached_result['query'] == 'portrait photos'
        assert len(cached_result['results']) == 2
        assert cached_result['results'][0]['score'] == 0.95
        
        db.close()


def test_database_manager():
    """Test the DatabaseManager high-level operations."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "test.db"
        db_manager = DatabaseManager(db_path)
        
        # Test photo operations
        metadata = {
            'filename': 'manager_test.jpg',
            'mtime': 1234567890.0,
            'size_bytes': 2048000,
            'width': 2560,
            'height': 1440
        }
        result = db_manager.upsert_photo('/manager/test.jpg', metadata)
        assert result is True
        
        photo = db_manager.get_photo('/manager/test.jpg')
        assert photo is not None
        assert photo['filename'] == 'manager_test.jpg'
        
        # Test search history
        result = db_manager.add_search(
            query='test query via manager',
            provider='local',
            top_k=12,
            filters={},
            result_count=3,
            search_time_ms=45.67,
            cached=False
        )
        assert result is True
        
        searches = db_manager.get_recent_searches(limit=5)
        assert len(searches) >= 1
        assert searches[0]['query'] == 'test query via manager'
        
        # Test activity logging
        result = db_manager.log_activity('test_action', path='/test/path')
        assert result is True
        
        activities = db_manager.get_activities(activity_type='test_action', limit=5)
        assert len(activities) >= 1
        
        # Test collections
        result = db_manager.create_collection('Manager Test Collection')
        assert result is True
        
        collection = db_manager.get_collection('Manager Test Collection')
        assert collection is not None
        
        # Test cached search
        test_results = [{'path': '/cached.jpg', 'score': 0.99}]
        result = db_manager.cache_search_results(
            cache_key='manager_test_key',
            query='manager test',
            provider='local',
            top_k=10,
            filters={},
            results=test_results
        )
        assert result is True
        
        cached = db_manager.get_cached_results('manager_test_key')
        assert cached is not None
        assert len(cached['results']) == 1
        
        db_manager.close()


def test_persistent_cache_integration():
    """Test that cached search results persist between sessions."""
    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = Path(temp_dir) / "persistent_test.db"
        
        # Session 1: Add cache entry
        db_manager1 = DatabaseManager(db_path)
        test_results = [{'path': '/persistence.jpg', 'score': 0.85}]
        
        result = db_manager1.cache_search_results(
            cache_key='persistence_test',
            query='persistence test',
            provider='local',
            top_k=10,
            filters={},
            results=test_results,
            ttl_seconds=7200  # 2 hours, should still be valid
        )
        assert result is True
        
        # Close first session
        db_manager1.close()
        
        # Session 2: Retrieve from persistent storage
        db_manager2 = DatabaseManager(db_path)
        
        # Should get the cached result from persistent storage
        cached = db_manager2.get_cached_results('persistence_test')
        assert cached is not None
        assert len(cached['results']) == 1
        assert cached['results'][0]['score'] == 0.85
        assert cached['query'] == 'persistence test'
        
        db_manager2.close()