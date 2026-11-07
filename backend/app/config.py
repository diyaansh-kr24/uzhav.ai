import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")
DATA = ROOT / "data"
DISTRICTS = ["Thanjavur", "Tiruvarur", "Nagapattinam"]
STAGES = ["coverage", "documents", "reporting", "follow_up", "grievance"]


def setting(name, default=""):
    return os.getenv(name, default).strip()


def configured(name):
    value = setting(name)
    return bool(value) and "your-" not in value and "replace" not in value.lower()
