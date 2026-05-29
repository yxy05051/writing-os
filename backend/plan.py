import re
from functools import lru_cache
from pathlib import Path
from typing import Optional


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PLAN_DIR = PROJECT_ROOT / "plans"
DEFAULT_PLAN = PROJECT_ROOT / "examples" / "plans" / "markdown-plan-template.md"
IMPORTED_PLAN = PLAN_DIR / "imported-plan.md"

ARTICLE_HEADING_RE = re.compile(
    r"^##\s+(?:(?:Article|Post|Chapter|Essay)\s*)?"
    r"(?P<num>\d{1,4})(?:\s*[|:.-]\s*|\.\s+)(?P<title>.+?)\s*$",
    re.M,
)


def _read_plan_text() -> str:
    plan_files = sorted(PLAN_DIR.glob("*.md")) if PLAN_DIR.exists() else []
    if plan_files:
        return "\n\n".join(path.read_text(encoding="utf-8-sig") for path in plan_files)
    if DEFAULT_PLAN.exists():
        return DEFAULT_PLAN.read_text(encoding="utf-8-sig")
    return ""


def _parse_article_plan_text(text: str) -> dict[int, dict]:
    plan: dict[int, dict] = {}
    matches = list(ARTICLE_HEADING_RE.finditer(text))

    for index, match in enumerate(matches):
        num = int(match.group("num"))
        title = match.group("title").strip()
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body = text[match.end():next_start].strip()
        tree_position = _extract_field(body, "Tree position")
        key_points = _extract_list(body, "Key points")
        constraints = _extract_list(body, "Constraints")
        first_body_line = body.splitlines()[0].strip() if body else ""
        goal = _extract_field(body, "Goal") or _extract_field(body, "Brief") or first_body_line
        plan[num] = {
            "num": num,
            "title": title,
            "full_title": f"Article {num:03d} | {title}",
            "goal": goal,
            "audience": _extract_field(text, "Audience") or _extract_field(body, "Audience"),
            "reader_level": _extract_field(body, "Reader level"),
            "outline": body,
            "key_points": key_points,
            "constraints": constraints,
            "next_hook": _extract_field(body, "Next hook"),
            "tree_position": {
                "path": tree_position,
                "layer_role": _extract_field(body, "Layer role"),
                "parent": tree_position.rsplit(">", 1)[0].strip() if ">" in tree_position else "",
                "children": "",
            },
        }

    return plan


def _extract_list(body: str, label: str) -> list[str]:
    pattern = rf"^{re.escape(label)}:\s*\n(?P<items>(?:-\s+.+\n?)+)"
    match = re.search(pattern, body, re.M)
    if not match:
        return []
    return [
        item.strip()
        for item in re.findall(r"^-\s+(.+?)\s*$", match.group("items"), re.M)
        if item.strip()
    ]


def _extract_field(body: str, label: str) -> str:
    match = re.search(rf"^{re.escape(label)}:\s*(.+?)\s*$", body, re.M)
    return match.group(1).strip() if match else ""


@lru_cache(maxsize=1)
def load_article_plan() -> dict[int, dict]:
    text = _read_plan_text()
    return _parse_article_plan_text(text)


def preview_article_plan_text(text: str) -> dict[int, dict]:
    return _parse_article_plan_text(text)


def save_imported_plan(text: str) -> dict:
    PLAN_DIR.mkdir(parents=True, exist_ok=True)
    IMPORTED_PLAN.write_text(text.strip() + "\n", encoding="utf-8")
    load_article_plan.cache_clear()
    plan = preview_article_plan_text(text)
    return {
        "status": "imported",
        "article_count": len(plan),
        "article_numbers": sorted(plan.keys()),
        "path": str(IMPORTED_PLAN),
    }


def format_article_plan_for_prompt(article_plan: dict) -> str:
    lines = [
        "ARTICLE PLAN",
        f"Number: {int(article_plan['num']):03d}",
        f"Title: {article_plan['full_title']}",
    ]
    if article_plan.get("audience"):
        lines.append(f"Audience: {article_plan['audience']}")
    if article_plan.get("reader_level"):
        lines.append(f"Reader level: {article_plan['reader_level']}")
    tree_position = article_plan.get("tree_position", {})
    if tree_position.get("path"):
        lines.extend([
            "",
            "Knowledge-map position:",
            f"- Path: {tree_position.get('path')}",
            f"- Role: {tree_position.get('layer_role') or 'Not specified'}",
        ])
    if article_plan.get("goal"):
        lines.extend(["", f"Goal: {article_plan['goal']}"])
    if article_plan.get("key_points"):
        lines.extend(["", "Key points:"])
        lines.extend(f"- {item}" for item in article_plan["key_points"])
    if article_plan.get("constraints"):
        lines.extend(["", "Constraints:"])
        lines.extend(f"- {item}" for item in article_plan["constraints"])
    if article_plan.get("next_hook"):
        lines.extend(["", f"Next hook: {article_plan['next_hook']}"])
    lines.extend(["", "Original plan text:", article_plan.get("outline", "")])
    return "\n".join(lines)


def get_article_plan(article_num: int) -> Optional[dict]:
    return load_article_plan().get(article_num)
