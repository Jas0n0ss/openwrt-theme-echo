#!/usr/bin/env python3
"""Write and read GNU ar archives (OpenWrt .ipk format)."""
import io
import struct
import sys
import tarfile
import time
from pathlib import Path


def pad(n: int) -> int:
    return (n + 1) if n % 2 else n


def ar_header(name: str, size: int) -> bytes:
    name_field = (name if name.endswith("/") else name + "/").encode("ascii")[:16]
    name_field = name_field.ljust(16, b" ")
    return b"".join([
        name_field,
        str(int(time.time())).encode("ascii").ljust(12)[:12],
        b"0".ljust(6)[:6],
        b"0".ljust(6)[:6],
        b"100644".ljust(8)[:8],
        str(size).encode("ascii").ljust(10)[:10],
        b"`\n",
    ])


def write_ar(out_path: Path, members: list[tuple[str, Path]]) -> None:
    with out_path.open("wb") as f:
        f.write(b"!<arch>\n")
        for name, path in members:
            data = path.read_bytes()
            f.write(ar_header(name, len(data)))
            f.write(data)
            if len(data) % 2:
                f.write(b"\n")


def read_ar_member(data: bytes, name: str) -> bytes | None:
    if not data.startswith(b"!<arch>\n"):
        return None
    pos = 8
    while pos + 60 <= len(data):
        header = data[pos : pos + 60]
        if header[58:60] != b"`\n":
            break
        mname = header[0:16].split(b"/")[0].split(b" ")[0].rstrip(b"\x00")
        size = int(header[48:58].decode("ascii").strip() or "0")
        pos += 60
        payload = data[pos : pos + size]
        pos += pad(size)
        if mname.decode("ascii", errors="ignore") == name:
            return payload
    return None


def extract_ipk_data(ipk_path: Path, out_dir: Path) -> None:
    payload = read_ar_member(ipk_path.read_bytes(), "data.tar.gz")
    if payload is None:
        raise SystemExit(f"data.tar.gz not found in {ipk_path}")
    out_dir.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(payload), mode="r:gz") as tar:
        tar.extractall(out_dir)


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "extract":
        extract_ipk_data(Path(sys.argv[2]), Path(sys.argv[3]))
        raise SystemExit(0)
    write_ar(Path(sys.argv[1]), [(Path(m).name, Path(m)) for m in sys.argv[2:]])
