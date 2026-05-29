from agents.base import BaseAgent


class FactCheckAgent(BaseAgent):
    def __init__(self, ws_manager, article_num: int, context: dict):
        super().__init__("fact_check", ws_manager, article_num, context)

    def get_system_prompt(self) -> str:
        return """You are the fact-checking agent.

Check factual accuracy and risky claims. Do not rewrite for style.

Check:
1. Factual claims
2. Technical or domain precision
3. Misleading metaphors
4. Unsupported dates, numbers, names, or causal claims

Do not check:
- Whether the prose is beautiful
- Whether the structure is elegant
- Whether the tone matches the brand

For each issue, return:

Quote: [problematic phrase]
Issue type: [factual error / overclaim / misleading metaphor / unsupported claim]
Why it matters: [...]
Suggested correction: [...]

If no meaningful issue is found, say so directly."""
