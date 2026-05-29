from plan import preview_article_plan_text


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
