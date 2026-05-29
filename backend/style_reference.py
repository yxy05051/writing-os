import re

from state import load_state


def _plain_lines(content: str) -> list[str]:
    text = re.sub(r"</(p|h1|h2|h3|li|div)>", "\n", content)
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return [line for line in lines if line]


def build_reference_style_brief(article_num: int, limit: int = 5) -> str:
    state = load_state()
    articles = state.get("articles", {})
    refs: list[str] = []

    for num in range(max(1, article_num - limit), article_num):
        article = articles.get(str(num), {})
        content = article.get("final_draft") or article.get("draft_html") or ""
        if not content:
            continue
        lines = _plain_lines(content)
        if not lines:
            continue
        opening = "\n".join(lines[:5])
        ending = "\n".join(lines[-4:])
        refs.append(
            f"Article {num:03d}: {article.get('title', '')}\n"
            f"Approx length: {len(content)} characters; paragraphs: {len(lines)}\n"
            f"Opening sample:\n{opening}\n"
            f"Ending sample:\n{ending}"
        )

    if not refs:
        return ""

    return (
        "STYLE REFERENCES\n"
        "These are not source material. Use them as rhythm, depth, and tone references.\n\n"
        + "\n\n---\n\n".join(refs)
        + "\n\nStyle alignment requirements:\n"
        "1. Match the project's established paragraph rhythm.\n"
        "2. Keep the article focused and avoid encyclopedic sprawl.\n"
        "3. Reuse prior concepts lightly; do not restart the series from zero.\n"
        "4. Preserve depth through structure and examples, not length.\n"
    )
