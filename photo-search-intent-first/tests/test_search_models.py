from api.search_models import SearchRequest, build_unified_request_from_flat


def test_dir_directory_alias_roundtrip():
    req = SearchRequest.from_query_params({"directory": "/photos", "query": "sunset"})
    assert req.dir == "/photos"
    # Model should allow population by field name too
    req2 = SearchRequest.from_query_params({"dir": "/photos", "query": "sunset"})
    assert req2.dir == "/photos"
    # Both present: dir wins (legacy precedence)
    req3 = SearchRequest.from_query_params({"dir": "/A", "directory": "/B", "query": "q"})
    assert req3.dir == "/A"


def test_persons_csv_and_list_handling():
    req = SearchRequest.from_query_params({"dir": "/p", "query": "x", "persons": "alice, bob,  carol ,,"})
    assert req.filters.persons == ["alice", "bob", "carol"]
    req2 = SearchRequest.from_query_params({"dir": "/p", "query": "x", "persons": ["dave", "eve"]})
    assert req2.filters.persons == ["dave", "eve"]


def test_build_unified_request_from_flat_drops_none():
    req = build_unified_request_from_flat(dir="/p", query="x", top_k=None, provider="local")
    # top_k should remain default (48) because None was filtered
    assert req.top_k == 48
    assert req.provider == "local"


def test_to_legacy_param_dict_parity():
    params = {
        "dir": "/p", "query": "clouds", "top_k": 24, "provider": "local", "use_captions": True,
        "favorites_only": True, "tags": ["t1", "t2"], "camera": "nikon", "iso_min": 100,
        "persons": "alice,bob"
    }
    req = SearchRequest.from_query_params(params)
    flat = req.to_legacy_param_dict()
    # Ensure critical fields preserved
    assert flat["dir"] == "/p"
    assert flat["query"] == "clouds"
    assert flat["top_k"] == 24
    assert flat["camera"] == "nikon"
    assert flat["iso_min"] == 100
    assert flat["persons"] == ["alice", "bob"]
    assert flat["favorites_only"] is True
    assert flat["use_captions"] is True
