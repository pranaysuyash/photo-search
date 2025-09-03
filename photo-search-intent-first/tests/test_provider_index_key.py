from pathlib import Path

from adapters.embedding_clip import ClipEmbedding
from adapters.embedding_transformers_clip import TransformersClipEmbedding
from infra.index_store import IndexStore


def run(tmp_root: Path):
    folder = tmp_root / "imgs"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "a.jpg").write_bytes(b"not-an-image")

    st = IndexStore(folder, index_key=ClipEmbedding().index_id)
    hf = IndexStore(folder, index_key=TransformersClipEmbedding().index_id)

    assert st.index_dir != hf.index_dir
    print("provider index dirs:", st.index_dir, hf.index_dir)


if __name__ == "__main__":
    run(Path("/tmp/ps_provider_index"))

