#!/usr/bin/env python3
"""Write GNU ar archive (OpenWrt .ipk format)."""
import struct
import sys
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


if __name__ == "__main__":
    write_ar(Path(sys.argv[1]), [(Path(m).name, Path(m)) for m in sys.argv[2:]])
