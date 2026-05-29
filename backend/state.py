import json
import os
from typing import Optional
from config import DATA_DIR

STATE_FILE = os.path.join(DATA_DIR, "writing_state.json")

DEFAULT_STATE = {
    "current_article": 1,
    "completed": [],
    "articles": {},
    "covered_concepts": [],
    "deviation_log": []
}


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def normalize_state(state: dict) -> dict:
    normalized = DEFAULT_STATE.copy()
    if isinstance(state, dict):
        normalized.update(state)
    normalized["completed"] = normalized.get("completed") or []
    normalized["articles"] = normalized.get("articles") or {}
    normalized["covered_concepts"] = normalized.get("covered_concepts") or []
    normalized["deviation_log"] = normalized.get("deviation_log") or []
    if normalized["articles"]:
        current = int(normalized.get("current_article") or DEFAULT_STATE["current_article"])
        while normalized["articles"].get(str(current), {}).get("official_published"):
            current += 1
        normalized["current_article"] = current
        if any(data.get("official_published") for data in normalized["articles"].values()):
            normalized["articles"].setdefault(str(current), {
                "title": "",
                "status": "pending",
            })
    return normalized


def load_state() -> dict:
    _ensure_data_dir()
    if not os.path.exists(STATE_FILE):
        state = normalize_state({})
        save_state(state)
        return state
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        try:
            raw = json.load(f)
        except json.JSONDecodeError:
            raw = {}
    state = normalize_state(raw)
    if state != raw:
        save_state(state)
    return state


def save_state(state: dict):
    _ensure_data_dir()
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def get_article_summary(article_num: int) -> Optional[dict]:
    state = load_state()
    return state["articles"].get(str(article_num))


def update_article(article_num: int, data: dict):
    state = load_state()
    key = str(article_num)
    articles = state.setdefault("articles", {})
    articles.setdefault(key, {})
    articles[key].update(data)
    save_state(state)


def get_covered_concepts() -> list:
    state = load_state()
    return state.get("covered_concepts", [])


def add_covered_concepts(concepts: list):
    state = load_state()
    existing = set(state.get("covered_concepts", []))
    for c in concepts:
        existing.add(c)
    state["covered_concepts"] = list(existing)
    save_state(state)
