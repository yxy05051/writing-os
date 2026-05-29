import httpx
from datetime import date
from config import NOTION_TOKEN, NOTION_DATABASE_ID


async def publish_to_notion(article_num: int, title: str, content: str) -> bool:
    """
    Create a Notion page.
    """
    if not NOTION_TOKEN or not NOTION_DATABASE_ID:
        raise ValueError("NOTION_TOKEN or NOTION_DATABASE_ID is not configured")

    today = date.today().isoformat()

    # Notion rich_text blocks have a 2000-character limit.
    content_blocks = []
    chunk_size = 2000
    for i in range(0, len(content), chunk_size):
        content_blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{
                    "type": "text",
                    "text": {"content": content[i:i + chunk_size]}
                }]
            }
        })

    payload = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": {
            "Name": {
                "title": [{"type": "text", "text": {"content": title}}]
            },
            "Number": {
                "number": article_num
            },
            "Category": {
                "select": {"name": "Writing"}
            },
            "Publish date": {
                "date": {"start": today}
            },
        },
        "children": content_blocks,
    }

    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.notion.com/v1/pages",
            json=payload,
            headers=headers,
        )

    if resp.status_code in (200, 201):
        return True

    raise RuntimeError(f"Notion API error {resp.status_code}: {resp.text}")


async def copy_for_publish(content: str) -> str:
    """
    Return a clean plain-text version for platforms that need copy/paste publishing.
    """
    lines = content.strip().split("\n")
    formatted_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            formatted_lines.append("")
            continue
        # Preserve Markdown heading lines as plain headings.
        if stripped.startswith("#"):
            formatted_lines.append(stripped.lstrip("#").strip())
            formatted_lines.append("")
        else:
            formatted_lines.append(stripped)

    # Collapse repeated blank lines.
    result = []
    prev_empty = False
    for line in formatted_lines:
        if line == "":
            if not prev_empty:
                result.append("")
            prev_empty = True
        else:
            result.append(line)
            prev_empty = False

    return "\n".join(result).strip()
