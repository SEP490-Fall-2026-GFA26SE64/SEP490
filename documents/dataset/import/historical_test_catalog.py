"""Pinned historical datasets for offline regression tests; mutable demo seeds are not release fixtures."""
import atexit
from functools import lru_cache
import gzip
from pathlib import Path
import shutil
import tempfile

@lru_cache(maxsize=1)
def catalog_root():
    source = Path(__file__).resolve().parent
    repo = source.parents[2]
    temporary = tempfile.TemporaryDirectory(prefix="historical-catalog-tests-")
    atexit.register(temporary.cleanup)
    root = Path(temporary.name) / "documents/dataset/import"
    root.mkdir(parents=True)
    fixtures = repo / "backend/src/test/resources/catalog"
    for name in ("ontology_seed-v010.json", "ontology_seed-v011.json", "ontology_seed-v012.json", "single-skill-v012-audit.json"):
        (root / name).write_bytes(gzip.decompress((fixtures / (name + ".gz")).read_bytes()))
    (root / "ontology_seed.json").write_bytes(gzip.decompress((fixtures / "ontology_seed-v09.json.gz").read_bytes()))
    shutil.copytree(source / "content", root / "content")
    shutil.copytree(source.parent / "sources", root.parent / "sources")
    old = root.parent / "question-bank/15-1212.00/historical"
    old.mkdir(parents=True)
    shutil.copy2(source.parent / "question-bank/15-1212.00/historical/ontology_seed-v08.json", old)
    seed = root.parents[2] / "backend/src/main/resources/db/seed"
    seed.mkdir(parents=True)
    shutil.copy2(repo / "backend/src/main/resources/db/seed/se-modules.json", seed)
    return root


@lru_cache(maxsize=1)
def original_review_root():
    """The v0.11 review/upgrade tests predate the later competency identity migration."""
    import json
    import zipfile
    source = Path(__file__).resolve().parent
    repo = source.parents[2]
    temporary = tempfile.TemporaryDirectory(prefix="original-review-tests-")
    atexit.register(temporary.cleanup)
    with zipfile.ZipFile(repo / "backend/src/test/resources/catalog/review-v011-original.zip") as archive:
        archive.extractall(temporary.name)
    root = Path(temporary.name) / "documents/dataset/import"
    # Release audit hashes were authored against LF Markdown bytes.
    for content in (root / "content").rglob("*.md"):
        content.write_bytes(content.read_bytes().replace(b"\r\n", b"\n"))
    # The public name changed; preserve historical IDs, business data and content bytes.
    def renamed(value):
        if isinstance(value, dict):
            return {{"Occupations":"JobPositions", "occupationId":"jobPositionId"}.get(k,k):renamed(v) for k,v in value.items()}
        if isinstance(value,list): return [renamed(v) for v in value]
        return value
    for path in list(root.glob("ontology_seed*.json")) + list((root.parent / "question-bank").rglob("ontology_seed*.json")):
        path.write_text(json.dumps(renamed(json.loads(path.read_text(encoding="utf-8"))),ensure_ascii=False),encoding="utf-8")
    evidence = root.parent / "sources/onet_five_occupations_2026_10_14"
    old = evidence / "occupation_title_evidence.json"
    if old.exists(): shutil.copy2(old,evidence / "job_position_title_evidence.json")
    return root
