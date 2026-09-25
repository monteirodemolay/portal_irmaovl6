#!/usr/bin/env python3
"""Read-only comparison of two offline Cripta exports against a separately trusted manifest digest.

The manifest is public metadata containing only opaque paths, sizes and SHA-256 digests.
This checks bit-level integrity, not decryption, recipient authorization or media lifetime.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path, PurePosixPath

BLOCK = 1024 * 1024
MAX_MANIFEST = 10 * 1024 * 1024
MAX_FILES = 100_000
DIGEST = re.compile(r"[0-9a-f]{64}\Z")


def digest_file(path: Path) -> tuple[str, int]:
    sha = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while chunk := stream.read(BLOCK):
            sha.update(chunk)
            size += len(chunk)
    return sha.hexdigest(), size


def safe_path(name: object) -> PurePosixPath:
    if not isinstance(name, str) or not name or "\\" in name or "\x00" in name:
        raise ValueError("Caminho inválido no inventário")
    path = PurePosixPath(name)
    if path.is_absolute() or any(part in (".", "..") for part in name.split("/")):
        raise ValueError("Caminho inseguro no inventário")
    return path


def verify(root: Path, items: list[dict]) -> list[str]:
    errors: list[str] = []
    if not root.is_dir() or root.is_symlink():
        return ["unidade indisponível ou link simbólico"]
    expected = {item["path"] for item in items}
    for item in items:
        path = root.joinpath(*PurePosixPath(item["path"]).parts)
        try:
            if path.is_symlink() or not path.is_file() or any(p.is_symlink() for p in path.parents if p != root and root in p.parents):
                errors.append(f'{item["path"]}: ausente ou link simbólico')
                continue
            actual_hash, actual_size = digest_file(path)
            if actual_hash != item["sha256"] or actual_size != item["bytes"]:
                errors.append(f'{item["path"]}: hash ou tamanho divergente')
        except OSError:
            errors.append(f'{item["path"]}: erro de leitura')
    try:
        for path in root.rglob("*"):
            if path.is_symlink():
                errors.append("link simbólico inesperado")
            elif path.is_file() and path.relative_to(root).as_posix() not in expected:
                errors.append("arquivo inesperado na unidade")
    except OSError:
        errors.append("erro ao listar a unidade")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Confere integralmente duas unidades externas da Cripta")
    parser.add_argument("manifest", type=Path, help="inventário JSON obtido por canal separado")
    parser.add_argument("unit_a", type=Path)
    parser.add_argument("unit_b", type=Path)
    parser.add_argument("--manifest-sha256", required=True, help="SHA-256 conferido em ata/canal independente")
    args = parser.parse_args()
    if not DIGEST.fullmatch(args.manifest_sha256):
        parser.error("SHA-256 do inventário inválido")
    if args.unit_a.resolve() == args.unit_b.resolve():
        parser.error("A e B precisam ser caminhos distintos")
    try:
        if args.manifest.stat().st_size > MAX_MANIFEST:
            raise ValueError("Inventário acima do limite")
        raw = args.manifest.read_bytes()
        if hashlib.sha256(raw).hexdigest() != args.manifest_sha256:
            raise ValueError("Inventário difere do hash aprovado")
        data = json.loads(raw)
        if not isinstance(data, dict) or data.get("format") != "vl6-export-v1" or not isinstance(data.get("files"), list):
            raise ValueError("Formato de inventário inválido")
        items = data["files"]
        if not items or len(items) > MAX_FILES:
            raise ValueError("Quantidade de arquivos inválida")
        names = set()
        for item in items:
            if not isinstance(item, dict):
                raise ValueError("Entrada inválida")
            name = safe_path(item.get("path")).as_posix()
            if name in names or not DIGEST.fullmatch(str(item.get("sha256", ""))) or type(item.get("bytes")) is not int or item["bytes"] < 0:
                raise ValueError("Entrada repetida ou inválida")
            names.add(name)
            item["path"] = name
        failures = False
        for label, root in (("A", args.unit_a), ("B", args.unit_b)):
            errors = verify(root, items)
            print(f"Unidade {label}: {'OK' if not errors else 'FALHA'} ({len(items)} arquivos esperados)")
            for error in errors[:20]:
                print(f"  {error}")
            failures = failures or bool(errors)
        if failures:
            return 1
        print("As duas unidades correspondem ao inventário aprovado. Teste de restauração e autenticação ainda é necessário.")
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Falha: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
