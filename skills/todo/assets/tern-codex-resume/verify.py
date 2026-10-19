"""Run the real Luau parser and window handler with a fake Tern host; no sessions open."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parent
luau = os.environ.get("LUAU") or shutil.which("luau")
if not luau:
    raise SystemExit("Install the official Luau CLI or set LUAU=/path/to/luau")

with tempfile.TemporaryDirectory(prefix="tern-codex-resume-check-") as temporary:
    stage = Path(temporary)
    shutil.copyfile(root / "binding.luau", stage / "binding.luau")
    test = (root / "verify.luau").read_text().replace(
        "--[[WINDOW_SOURCE]]", (root / "window.luau").read_text()
    )
    (stage / "verify.luau").write_text(test)
    subprocess.run([luau, str(stage / "verify.luau")], check=True)
