import plan as plan_module
from plan import get_plan_source, preview_article_plan_text


def test_preview_article_plan_text_parses_common_markdown_headings():
    text = """# Test Project

Audience: Technical founders.

## Article 001 | Orientation

Goal: Set the map.
Reader level: Beginner.
Tree position: Foundation > Orientation.
Key points:
- Why this matters
- What comes next
Constraints:
- Keep it concrete
Next hook: Move to the workflow.

## 002. Core workflow

Brief: Explain the repeatable workflow.
Key points:
- Inputs
- Process
- Outputs
"""

    plan = preview_article_plan_text(text)

    assert sorted(plan.keys()) == [1, 2]
    assert plan[1]["title"] == "Orientation"
    assert plan[1]["goal"] == "Set the map."
    assert plan[1]["audience"] == "Technical founders."
    assert plan[1]["tree_position"]["path"] == "Foundation > Orientation."
    assert plan[1]["key_points"] == ["Why this matters", "What comes next"]
    assert plan[1]["constraints"] == ["Keep it concrete"]
    assert plan[2]["full_title"] == "Article 002 | Core workflow"
    assert plan[2]["goal"] == "Explain the repeatable workflow."


def test_get_plan_source_prefers_imported_plans(tmp_path, monkeypatch):
    plan_dir = tmp_path / "plans"
    plan_dir.mkdir()
    imported = plan_dir / "imported-plan.md"
    imported.write_text("## Article 001 | Imported\n\nGoal: Test.\n", encoding="utf-8")
    default = tmp_path / "example.md"
    default.write_text("## Article 001 | Example\n\nGoal: Test.\n", encoding="utf-8")

    monkeypatch.setattr(plan_module, "PLAN_DIR", plan_dir)
    monkeypatch.setattr(plan_module, "DEFAULT_PLAN", default)

    source = get_plan_source()

    assert source["source"] == "imported"
    assert source["path"] == str(plan_dir)
    assert source["files"] == [str(imported)]


def test_get_plan_source_falls_back_to_example_plan(tmp_path, monkeypatch):
    plan_dir = tmp_path / "plans"
    default = tmp_path / "example.md"
    default.write_text("## Article 001 | Example\n\nGoal: Test.\n", encoding="utf-8")

    monkeypatch.setattr(plan_module, "PLAN_DIR", plan_dir)
    monkeypatch.setattr(plan_module, "DEFAULT_PLAN", default)

    source = get_plan_source()

    assert source["source"] == "example"
    assert source["path"] == str(default)
