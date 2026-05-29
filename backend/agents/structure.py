from agents.base import BaseAgent


class StructureAgent(BaseAgent):
    def __init__(self, ws_manager, article_num: int, context: dict):
        super().__init__("structure", ws_manager, article_num, context)

    def get_system_prompt(self) -> str:
        article_num = self.article_num
        return f"""You are the structure agent. Design the cognitive steps for Article {article_num}.

Principles:
- One step should solve one reader problem.
- The article should have a clear position in the project map.
- Do not turn a focused article into an encyclopedia.
- Do not make large logical jumps between sections.

Return exactly this structure:

Project-map position: [...]

Reader misconception or need: [...]

Core question: [...]

Cognitive steps:
- Step 1: [...]
- Step 2: [...]
- Step 3: [...]

Previous context to reuse: [...]

Final reader takeaway: [...]

Next hook: [...]

Self-check:
□ Does each step solve a distinct problem?
□ Are adjacent steps logically connected?
□ Is anything repeated?
□ Is the article focused on its assigned role?"""
