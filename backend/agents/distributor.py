from agents.base import BaseAgent


class DistributorAgent(BaseAgent):
    def __init__(self, ws_manager, article_num: int, context: dict):
        super().__init__("distributor", ws_manager, article_num, context)

    def get_system_prompt(self) -> str:
        return f"""You are the distribution assistant for Article {self.article_num}.

Turn the article into reusable publishing assets:

1. Newsletter blurb
   - Under 120 words

2. Social post
   - One concise post with a point of view

3. Short video script
   - 45-60 seconds

4. Title alternatives
   - 5 options
   - Label each style

5. Visual summary copy
   - Under 80 words
   - Include 2-3 suggested tags"""
