from agents.base import BaseAgent


class ResearchAgent(BaseAgent):
    def __init__(self, ws_manager, article_num: int, context: dict):
        super().__init__("research", ws_manager, article_num, context)

    def get_system_prompt(self) -> str:
        covered = self.context.get("covered_concepts", [])
        covered_str = ", ".join(covered) if covered else "none"
        article_num = self.article_num
        article_plan = self.context.get("article_plan") or {}
        planned_title = article_plan.get("full_title")
        planned_outline = article_plan.get("outline", "")
        plan_text = (
            f"\nAssigned plan: {planned_title}\n{planned_outline}\n"
            "Stay on this assigned topic. Do not replace it with a different article.\n"
            if planned_title
            else ""
        )
        return f"""You are the research agent for a multi-agent writing system.
Current task: prepare research material for Article {article_num}.
{plan_text}

Audience: use the project plan as the source of truth. If the plan does not specify an audience, assume smart non-specialist readers.
Previously covered concepts: {covered_str}

Return a structured research brief with:

1. Article position
   - Where this article sits in the project map
   - What it should cover
   - What it should avoid covering too early

2. Core concept or claim
   - One-sentence definition
   - Why it matters to the reader
   - How it connects to previous articles

3. Evidence, examples, or source angles
   - 3 useful examples or phenomena
   - What each example helps explain

4. Common misunderstandings
   - 3 likely misunderstandings
   - How the article should correct them

5. Next hook
   - A natural question that can lead into the next article"""
