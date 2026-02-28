"""
CyberSentinel – Local Data Server
==================================
Run this on YOUR LAPTOP to let the cloud backend (Render / any remote host)
download dataset chunks during model training.

Usage
-----
    python data_server.py

Then expose it with ngrok (recommended):
    ngrok http 7860

Copy the ngrok HTTPS URL and set it as an environment variable on Render:
    DATA_SOURCE_URL=https://xxxx-xxxx.ngrok-free.app
    DATA_SECRET=your_chosen_secret_token

The cloud backend will automatically stream data from this server whenever
the dataset files are not present on the server's filesystem.
"""

import os
import csv
import io
import json
import hashlib
import itertools
import pathlib
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

# ── Configuration ──────────────────────────────────────────────────────────
PORT = 7860
DATA_DIR = pathlib.Path(__file__).parent  # same folder as this script
DATASET_FILES = [
    "dataset-part1.csv",
    "dataset-part2.csv",
    "dataset-part3.csv",
    "dataset-part4.csv",
]

# Secret token for basic auth — set DATA_SECRET env var or change the default
SECRET = os.environ.get("DATA_SECRET", "cybersentinel-local-2024")

SELECTED_COLUMNS = [
    'DST_TOS', 'SRC_TOS', 'TCP_WIN_SCALE_OUT', 'TCP_WIN_SCALE_IN', 'TCP_FLAGS',
    'TCP_WIN_MAX_OUT', 'PROTOCOL', 'TCP_WIN_MIN_OUT', 'TCP_WIN_MIN_IN',
    'TCP_WIN_MAX_IN', 'LAST_SWITCHED', 'TCP_WIN_MSS_IN', 'TOTAL_FLOWS_EXP',
    'FIRST_SWITCHED', 'FLOW_DURATION_MILLISECONDS', 'LABEL'
]

# ── Helpers ────────────────────────────────────────────────────────────────

def _auth_ok(handler) -> bool:
    """Validate the secret token from the Authorization header."""
    auth = handler.headers.get("Authorization", "")
    return auth == f"Bearer {SECRET}"


def _send_json(handler, data: dict, code: int = 200):
    body = json.dumps(data).encode()
    handler.send_response(code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _stream_csv_sample(handler, sample_size: int):
    """
    Read rows from ALL available dataset CSVs, interleaved, and stream
    exactly `sample_size` rows back to the client as CSV text.
    Streaming avoids loading everything into RAM on the laptop too.
    """
    files = [DATA_DIR / f for f in DATASET_FILES if (DATA_DIR / f).exists()]
    if not files:
        _send_json(handler, {"error": "No dataset files found on host"}, 503)
        return

    rows_per_file = max(1, sample_size // len(files))

    # Build an iterator over rows from each file, taking rows_per_file each
    def file_rows(fp, n):
        with open(fp, newline='', encoding='utf-8', errors='replace') as f:
            reader = csv.DictReader(f)
            # Filter to only selected columns that exist
            cols = [c for c in SELECTED_COLUMNS if c in (reader.fieldnames or [])]
            if not cols:
                return
            count = 0
            for row in reader:
                if count >= n:
                    break
                yield {c: row.get(c, '') for c in cols}
                count += 1

    # Collect all rows (from all files, interleaved)
    all_rows = list(itertools.chain.from_iterable(file_rows(fp, rows_per_file) for fp in files))

    if not all_rows:
        _send_json(handler, {"error": "No rows could be read"}, 500)
        return

    # Write CSV to a bytes buffer
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=SELECTED_COLUMNS)
    writer.writeheader()
    writer.writerows(all_rows)

    body = buf.getvalue().encode('utf-8')

    handler.send_response(200)
    handler.send_header("Content-Type", "text/csv; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("X-Row-Count", str(len(all_rows)))
    handler.end_headers()
    handler.wfile.write(body)
    print(f"  ✓ Served {len(all_rows):,} rows ({len(body):,} bytes) to {handler.client_address[0]}")


# ── Request Handler ────────────────────────────────────────────────────────

class DataHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):  # suppress default access log clutter
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        # ── /health — public, no auth needed ─────────────────────────────
        if path == "/health":
            available = [f for f in DATASET_FILES if (DATA_DIR / f).exists()]
            _send_json(self, {
                "status": "ok",
                "datasets_available": available,
                "total_files": len(available),
            })
            return

        # ── All other endpoints require auth ──────────────────────────────
        if not _auth_ok(self):
            self.send_response(401)
            self.send_header("WWW-Authenticate", 'Bearer realm="DataServer"')
            self.end_headers()
            return

        # ── /data — stream CSV sample ─────────────────────────────────────
        if path == "/data":
            try:
                sample_size = int(params.get("sample_size", ["100000"])[0])
                sample_size = max(1000, min(sample_size, 2_000_000))  # clamp
            except ValueError:
                sample_size = 100_000

            print(f"[{self.client_address[0]}] GET /data?sample_size={sample_size}")
            _stream_csv_sample(self, sample_size)
            return

        # ── /info — dataset metadata ──────────────────────────────────────
        if path == "/info":
            info = {}
            for fname in DATASET_FILES:
                fp = DATA_DIR / fname
                if fp.exists():
                    size_mb = fp.stat().st_size / (1024 * 1024)
                    info[fname] = {"size_mb": round(size_mb, 1), "available": True}
                else:
                    info[fname] = {"available": False}
            _send_json(self, {"datasets": info})
            return

        self.send_response(404)
        self.end_headers()


# ── Entry Point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  CyberSentinel - Local Data Server")
    print("=" * 60)

    available = [f for f in DATASET_FILES if (DATA_DIR / f).exists()]
    if not available:
        print("  ⚠  WARNING: No dataset CSVs found in this directory!")
        print(f"  Expected files: {DATASET_FILES}")
    else:
        total_gb = sum((DATA_DIR / f).stat().st_size for f in available) / (1024 ** 3)
        print(f"  ✓ Datasets found : {', '.join(available)}")
        print(f"  ✓ Total size     : {total_gb:.2f} GB")

    print(f"\n  Listening on    : http://0.0.0.0:{PORT}")
    print(f"  Secret token    : {SECRET}")
    print()
    print("  Next steps:")
    print("  1. Keep this terminal open (server must stay running during training)")
    print(f"  2. Run: ngrok http {PORT}")
    print("  3. Copy the ngrok HTTPS URL (e.g. https://xxxx.ngrok-free.app)")
    print("  4. On Render, set these environment variables:")
    print(f"       DATA_SOURCE_URL = <your ngrok URL>")
    print(f"       DATA_SECRET     = {SECRET}")
    print("=" * 60)

    server = HTTPServer(("0.0.0.0", PORT), DataHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
