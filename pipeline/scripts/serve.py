"""Servidor HTTP de desarrollo con soporte de Range (para probar reanudación desde el iPhone).

Uso: python serve.py DIRECTORIO [PUERTO]
Solo para la red local: la app admite http únicamente hacia IPs privadas (NSAllowsLocalNetworking).
`python -m http.server` no sirve: no implementa Range y la reanudación empezaría de cero.
"""

from __future__ import annotations

import os
import re
import sys
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

_RANGE = re.compile(r"^bytes=(\d*)-(\d*)$")


def parse_range(header: str | None, size: int) -> tuple[int, int] | None:
    """(inicio, fin inclusivo) o None si no hay Range válido de un único tramo."""
    if not header:
        return None
    match = _RANGE.match(header.strip())
    if not match or (not match.group(1) and not match.group(2)):
        return None
    start_s, end_s = match.groups()
    if start_s:
        start = int(start_s)
        end = min(int(end_s), size - 1) if end_s else size - 1
    else:
        length = int(end_s)
        start, end = max(size - length, 0), size - 1
    return (start, end) if start <= end < size else None


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):  # noqa: D401 - API de http.server
        path = self.translate_path(self.path)
        if os.path.isdir(path) or not os.path.exists(path):
            return super().send_head()
        size = os.path.getsize(path)
        requested = parse_range(self.headers.get("Range"), size)
        if self.headers.get("Range") and requested is None:
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None
        f = open(path, "rb")  # noqa: SIM115 - lo cierra copyfile
        if requested is None:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Length", str(size))
            self._range = None
        else:
            start, end = requested
            f.seek(start)
            self.send_response(HTTPStatus.PARTIAL_CONTENT)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self._range = end - start + 1
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_range", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(1 << 16, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        return None


def main(argv: list[str]) -> int:
    directory = argv[1] if len(argv) > 1 else "."
    port = int(argv[2]) if len(argv) > 2 else 8080
    server = ThreadingHTTPServer(("0.0.0.0", port), partial(RangeHandler, directory=directory))
    print(f"Sirviendo {directory} en http://0.0.0.0:{port} (Range habilitado). Ctrl+C para salir.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
