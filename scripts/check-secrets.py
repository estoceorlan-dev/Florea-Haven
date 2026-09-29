"""Scan project source for high-confidence credential patterns without printing secrets."""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
paths = (
    subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    )
    .decode("utf-8")
    .split("\0")
)
patterns = [
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r"\bAKIA[0-9A-Z]{16}\b",
    r"\bgh[pousr]_[A-Za-z0-9]{36,}\b",
    r"\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b",
    r"cloudinary://[0-9]{10,}:[A-Za-z0-9_-]{20,}@",
]
failures = []
for name in set(paths):
    if not name:
        continue
    path = ROOT / name
    if not path.is_file() or path.stat().st_size > 2_000_000:
        continue
    if path.name in {".env", ".env.local", ".env.production"}:
        failures.append(name)
        continue
    content = path.read_text(encoding="utf-8", errors="replace")
    if any(re.search(pattern, content) for pattern in patterns):
        failures.append(name)
if failures:
    print("Potential credentials found; inspect locally (values redacted):")
    print("\n".join(sorted(failures)))
    sys.exit(1)
print(
    "No high-confidence credentials found in project source. This scan is not exhaustive."
)
