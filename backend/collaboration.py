import asyncio
from datetime import datetime, timezone
from uuid import uuid4

from agents.fact_check import FactCheckAgent
from agents.growth import GrowthAgent
from agents.reader_sim import ReaderSimAgent
from agents.reviewer import ReviewerAgent
from agents.style import StyleAgent
from agents.structure import StructureAgent
from agents.writer import WriterAgent
from state import get_covered_concepts, load_state, update_article


COLLABORATION_AGENTS = {
    "structure": StructureAgent,
    "writer": WriterAgent,
    "reader_sim": ReaderSimAgent,
    "fact_check": FactCheckAgent,
    "style": StyleAgent,
    "reviewer": ReviewerAgent,
    "growth": GrowthAgent,
}

_COLLABORATION_LOCKS: dict[int, asyncio.Lock] = {}


def _collaboration_lock(article_num: int) -> asyncio.Lock:
    if article_num not in _COLLABORATION_LOCKS:
        _COLLABORATION_LOCKS[article_num] = asyncio.Lock()
    return _COLLABORATION_LOCKS[article_num]


def _select_agents(instruction: str) -> list[str]:
    text = instruction.lower()
    selected: list[str] = []
    rules = [
        ("structure", ["结构", "逻辑", "顺序", "框架", "台阶"]),
        ("writer", ["重写", "改写", "扩写", "删减", "正文"]),
        ("reader_sim", ["读者", "看不懂", "理解", "卡住", "体验"]),
        ("fact_check", ["事实", "数据", "准确", "校对", "引用"]),
        ("style", ["风格", "表达", "语气", "标题", "金句"]),
        ("growth", ["growth", "distribution", "hook", "传播", "转发", "增长", "开头"]),
    ]
    for agent, keywords in rules:
        if any(keyword in text for keyword in keywords):
            selected.append(agent)

    if not selected:
        selected = ["reviewer"]

    if "reviewer" not in selected:
        selected.append("reviewer")

    return selected[:3]


def _article_content(article_data: dict) -> str:
    outputs = article_data.get("agent_outputs", {})
    return (
        article_data.get("final_draft")
        or article_data.get("draft_html")
        or outputs.get("style")
        or outputs.get("writer")
        or ""
    )


def _append_collaboration_log(article_num: int, items: list[dict], instruction: str, agents: list[str]):
    state = load_state()
    article = state.setdefault("articles", {}).setdefault(str(article_num), {})
    collaboration = article.setdefault("collaboration", {})
    existing = collaboration.setdefault("log", [])
    existing.extend(items)
    collaboration["last_instruction"] = instruction
    collaboration["active_agents"] = []
    update_article(article_num, {"collaboration": collaboration})


async def _persist_collaboration_item(
    article_num: int,
    item: dict,
    instruction: str,
    remaining_agents: list[str],
):
    async with _collaboration_lock(article_num):
        state = load_state()
        article = state.setdefault("articles", {}).setdefault(str(article_num), {})
        collaboration = article.setdefault("collaboration", {})
        log = collaboration.setdefault("log", [])
        outputs = collaboration.setdefault("outputs", {})

        log.append(item)
        if item.get("agent") and item.get("content"):
            outputs[item["agent"]] = item["content"]

        collaboration["last_instruction"] = instruction
        collaboration["active_agents"] = remaining_agents
        update_article(article_num, {"collaboration": collaboration})


async def _run_agent(agent_name: str, article_num: int, instruction: str, article_data: dict, ws_manager):
    AgentClass = COLLABORATION_AGENTS[agent_name]
    content = _article_content(article_data)
    context = {
        "article_num": article_num,
        "covered_concepts": get_covered_concepts(),
        "outputs": article_data.get("agent_outputs", {}),
        "final_draft": content,
        "collaboration": article_data.get("collaboration", {}),
    }
    agent = AgentClass(ws_manager, article_num, context)
    message = (
        "You are joining a Writing OS multi-agent editorial roundtable. "
        "Focus only on the user's instruction and the current final draft. "
        "Do not make the user's final decision for them.\n\n"
        f"USER INSTRUCTION\n{instruction}\n\n"
        f"CURRENT FINAL DRAFT\n{content}\n\n"
        "Output: 1. your judgment; 2. issues that must be handled; "
        "3. which agent or user should handle them."
    )
    output = await agent.run(message)
    return {
        "id": str(uuid4()),
        "agent": agent_name,
        "type": "critique",
        "target": "final_draft",
        "severity": "medium",
        "content": output,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def _run_and_persist_agent(
    agent_name: str,
    article_num: int,
    instruction: str,
    article_data: dict,
    ws_manager,
    active_agents: set[str],
):
    try:
        item = await _run_agent(agent_name, article_num, instruction, article_data, ws_manager)
    except Exception as exc:
        item = {
            "id": str(uuid4()),
            "agent": agent_name,
            "type": "summary",
            "target": "agent",
            "severity": "high",
            "content": f"Agent execution error: {exc}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    active_agents.discard(agent_name)
    await _persist_collaboration_item(
        article_num,
        item,
        instruction,
        [agent for agent in active_agents],
    )
    return item


async def run_collaboration(article_num: int, instruction: str, ws_manager):
    state = load_state()
    article_data = state.get("articles", {}).get(str(article_num), {})

    if article_data.get("official_published"):
        await ws_manager.broadcast({
            "type": "collaboration_status",
            "articleNum": article_num,
            "status": "blocked",
            "message": "This article has been published and is frozen.",
        })
        return

    agents = _select_agents(instruction)
    collaboration = article_data.get("collaboration", {})
    collaboration["last_instruction"] = instruction
    collaboration["active_agents"] = agents
    update_article(article_num, {"collaboration": collaboration})

    await ws_manager.broadcast({
        "type": "collaboration_status",
        "articleNum": article_num,
        "status": "running",
        "agents": agents,
        "message": "Collaboration roundtable started",
    })

    active_agents = set(agents)
    tasks = [
        _run_and_persist_agent(agent_name, article_num, instruction, article_data, ws_manager, active_agents)
        for agent_name in agents
    ]
    await asyncio.gather(*tasks)

    await ws_manager.broadcast({
        "type": "collaboration_done",
        "articleNum": article_num,
        "agents": agents,
        "message": "Collaboration roundtable completed",
    })
