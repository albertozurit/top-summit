import hashlib
import json
from pathlib import Path

from manifest import build_manifest
from zones import load_zones

ROOT = Path(__file__).resolve().parent.parent
EXAMPLE = ROOT.parent / "docs" / "manifest.example.json"


def _keys(value, prefix=""):
    """Estructura de claves (no valores) para comparar con el ejemplo que valida la app."""
    if isinstance(value, dict):
        return {k for key, v in value.items() for k in _keys(v, f"{prefix}.{key}")} | {prefix}
    if isinstance(value, list) and value:
        return _keys(value[0], f"{prefix}[]")
    return {prefix}


def test_manifest_con_bytes_md5_y_version(tmp_path):
    zones = load_zones(ROOT / "zones.yaml")
    (tmp_path / "benasque-vector.pmtiles").write_bytes(b"v" * 100)
    (tmp_path / "benasque-raster.pmtiles").write_bytes(b"r" * 50)
    (tmp_path / "benasque.osmdate").write_text("2026-09-29\n")

    manifest = build_manifest([zones["benasque"]], tmp_path, None)
    zone = manifest["zones"][0]
    vector_md5 = hashlib.md5(b"v" * 100).hexdigest()

    assert manifest["schemaVersion"] == 1
    assert zone["osmDate"] == "2026-09-29"
    assert zone["version"] == f"2026-09-29.{vector_md5[:8]}"
    assert zone["files"] == [
        {"kind": "vector", "url": "benasque-vector.pmtiles", "bytes": 100, "md5": vector_md5},
        {"kind": "raster", "url": "benasque-raster.pmtiles", "bytes": 50, "md5": hashlib.md5(b"r" * 50).hexdigest()},
    ]
    assert any("OpenStreetMap" in a for a in zone["attribution"])


def test_misma_estructura_que_el_ejemplo_validado_por_la_app(tmp_path):
    """docs/manifest.example.json lo valida Zod en src/domain/manifest.test.ts: contrato entre ambos lados."""
    zones = load_zones(ROOT / "zones.yaml")
    (tmp_path / "benasque-vector.pmtiles").write_bytes(b"v")
    (tmp_path / "benasque-raster.pmtiles").write_bytes(b"r")
    (tmp_path / "benasque.osmdate").write_text("2026-09-29")
    generated = build_manifest([zones["benasque"]], tmp_path, "https://github.com/u/r/releases/download/zones-1")
    example = json.loads(EXAMPLE.read_text(encoding="utf-8"))
    assert _keys(generated) == _keys(example)
