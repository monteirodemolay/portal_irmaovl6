#!/usr/bin/env python3
"""Copy an already encrypted Cripta export to an EMPTY replacement medium.

Run only on an authorized offline workstation. Source and replacement are checked
against a separately approved manifest. No keys or plaintext are needed.
"""
import argparse
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

from verify_copies import DIGEST, MAX_FILES, MAX_MANIFEST, safe_path, verify


def main() -> int:
    parser = argparse.ArgumentParser(description="Repor unidade extraviada a partir de uma cópia íntegra")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("source", type=Path, help="unidade íntegra, mantida somente para leitura")
    parser.add_argument("replacement", type=Path, help="unidade nova, vazia e já montada")
    parser.add_argument("--manifest-sha256", required=True, help="hash aprovado fora das unidades")
    args = parser.parse_args()
    if not DIGEST.fullmatch(args.manifest_sha256):
        parser.error("hash aprovado inválido")
    source, replacement = args.source.resolve(), args.replacement.resolve()
    if source == replacement or source in replacement.parents or replacement in source.parents:
        parser.error("origem e destino precisam ser unidades distintas")
    try:
        if args.source.is_symlink() or args.replacement.is_symlink() or not source.is_dir() or not replacement.is_dir():
            raise ValueError("unidade ausente ou link simbólico")
        if any(replacement.iterdir()):
            raise ValueError("destino deve estar completamente vazio; nenhum arquivo será sobrescrito")
        if args.manifest.stat().st_size > MAX_MANIFEST:
            raise ValueError("inventário acima do limite")
        raw = args.manifest.read_bytes()
        if hashlib.sha256(raw).hexdigest() != args.manifest_sha256:
            raise ValueError("inventário não corresponde ao hash aprovado")
        data = json.loads(raw)
        if not isinstance(data, dict) or data.get("format") != "vl6-export-v1" or not isinstance(data.get("files"), list):
            raise ValueError("formato do inventário inválido")
        items = data["files"]
        if not items or len(items) > MAX_FILES:
            raise ValueError("quantidade de arquivos inválida")
        names = set()
        for item in items:
            if not isinstance(item, dict):
                raise ValueError("entrada inválida")
            name = safe_path(item.get("path")).as_posix()
            if name in names or not DIGEST.fullmatch(str(item.get("sha256", ""))) or type(item.get("bytes")) is not int or item["bytes"] < 0:
                raise ValueError("entrada repetida ou inválida")
            names.add(name)
            item["path"] = name
        errors = verify(source, items)
        if errors:
            raise ValueError("origem reprovada: " + "; ".join(errors[:3]))
        print("Origem íntegra. Iniciando cópia cifrada para unidade vazia.")
        for item in items:
            origin = source.joinpath(*safe_path(item["path"]).parts)
            target = replacement.joinpath(*safe_path(item["path"]).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(target.name + ".partial")
            # Exclusive creation prevents silently replacing any pre-existing target.
            with origin.open("rb") as src, temporary.open("xb") as dst:
                shutil.copyfileobj(src, dst, 1024 * 1024)
                dst.flush()
                os.fsync(dst.fileno())
            temporary.replace(target)
        errors = verify(replacement, items)
        if errors:
            raise ValueError("nova unidade reprovada: " + "; ".join(errors[:3]))
        print(f"Nova unidade íntegra: {len(items)} arquivos cifrados. Ejetar, reconectar e verificar novamente antes da guarda.")
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Falha: {error}. Não reutilizar a unidade sem investigação.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
