from agents.base import BaseAgent


class ReviewerAgent(BaseAgent):
    def __init__(self, ws_manager, article_num: int, context: dict):
        super().__init__("reviewer", ws_manager, article_num, context)

    def get_system_prompt(self) -> str:
        covered = self.context.get("covered_concepts", [])
        covered_str = ", ".join(covered) if covered else "none"
        return f"""You are the editorial reviewer for Article {self.article_num}.

Do not rewrite the article. Produce a structured review.

Covered concepts: {covered_str}

Review sections:

1. Density score
   - Score: X/10
   - Reason

2. Structure and logic
   - Jumps
   - Repetition
   - Missing transitions

3. Plan alignment
   - What matches the plan
   - What drifts from the plan
   - Missing required ideas

4. Reader experience
   - Opening
   - Hardest section
   - Ending

5. Actionable edits
   - Must fix
   - Nice to improve
   - Depth to add back

6. Verdict
   - Ready for final editor: yes/no
   - One-sentence reason"""
