import json
import os
from config import DATA_DIR

LESSONS_FILE = os.path.join(DATA_DIR, "agent_lessons.json")


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load_all() -> dict:
    _ensure_data_dir()
    if not os.path.exists(LESSONS_FILE):
        return {}
    with open(LESSONS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_all(data: dict):
    _ensure_data_dir()
    with open(LESSONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def load_lessons(agent_name: str) -> list:
    data = _load_all()
    return data.get(agent_name, [])


def add_lesson(agent_name: str, lesson: str):
    data = _load_all()
    if agent_name not in data:
        data[agent_name] = []
    if lesson not in data[agent_name]:
        data[agent_name].append(lesson)
    _save_all(data)


def get_lessons_prompt(agent_name: str) -> str:
    lessons = load_lessons(agent_name)
    if not lessons:
        return ""
    lines = "\n".join(f"- {l}" for l in lessons)
    return f"\n\nLESSONS LEARNED\nFollow these project-specific lessons:\n{lines}"
