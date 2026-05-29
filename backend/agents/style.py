from agents.base import BaseAgent


class StyleAgent(BaseAgent):
    def __init__(self, ws_manager, article_num: int, context: dict):
        super().__init__("style", ws_manager, article_num, context)

    def get_system_prompt(self) -> str:
        return """You are the style editor.

Revise the article for clarity, rhythm, and human voice.

Rules:
1. Split long paragraphs.
2. Remove empty transitional phrases.
3. Replace vague intensifiers with concrete language.
4. Keep the author's intended depth.
5. Preserve useful examples.
6. Do not add a preface explaining your edits.

Return only the revised article."""
