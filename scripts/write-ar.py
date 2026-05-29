#!/usr/bin/env python3
"""Write/read GNU ar archive (OpenWrt .ipk format)."""
import struct
import sys
import tarfile
from pathlib import Path


def pad(n: int) -> int:
    return (n + 1) if n % 2 else n


def write_ar(out_path: Path, members: list[tuple[str, Path]]) -> None:
    with out_path.open("wb") as f:
        f.write(b"!<arch>\n")
        for name, path in members:
            data = path.read_bytes()
            header = struct.pack(
                "16s12s6s6s8s10s",
                name.encode("ascii")[:16],
                str(len(data)).encode("ascii"),
                b"0",
                b"0",
                b"0",
                b"0",
            )
            f.write(header)
            f.write(data)
            if len(data) % 2:
                f.write(b"\n")


def read_member(ipk_path: Path, member_name: str) -> bytes:
    data = ipk_path.read_bytes()
    if not data.startswith(b"!<arch>\n"):
        raise ValueError(f"not a GNU ar archive: {ipk_path}")

    pos = 8
    header_size = 58
    while pos + header_size <= len(data):
        header = data[pos:pos + header_size]
        name = header[0:16].split(b"\0", 1)[0].decode("ascii")
        size = int(header[16:28].split(b"\0", 1)[0] or b"0")
        pos += header_size
        payload = data[pos:pos + size]
        pos += pad(size)
        if name == member_name.rstrip("/"):
            return payload

    raise ValueError(f"member not found in {ipk_path}: {member_name}")


def extract_ipk(ipk_path: Path, dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    payload = read_member(ipk_path, "data.tar.gz")
    tar_path = dest / "data.tar.gz"
    tar_path.write_bytes(payload)
    with tarfile.open(tar_path, "r:gz") as tar:
        tar.extractall(dest)
    tar_path.unlink()


if __name__ == "__main__":
    if len(sys.argv) >= 2 and sys.argv[1] == "--extract":
        extract_ipk(Path(sys.argv[2]), Path(sys.argv[3]))
    else:
        write_ar(Path(sys.argv[1]), [(Path(m).name, Path(m)) for m in sys.argv[2:]])
