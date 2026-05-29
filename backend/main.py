import asyncio
import json
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from ws_manager import WebSocketManager
from pipeline import AGENT_ORDER, Pipeline
from state import load_state, update_article, save_state, get_covered_concepts
from lessons import load_lessons, add_lesson
from publish import publish_to_notion, copy_for_publish
from collaboration import run_collaboration
from plan import get_article_plan, preview_article_plan_text, save_imported_plan
from agents.planning import PlanningAgent


ws_manager = WebSocketManager()
pipeline = Pipeline(ws_manager)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Writing OS Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ──────────────────────────────────────────────────────────

class StartPipelineRequest(BaseModel):
    article_num: int


class ContinuePipelineRequest(BaseModel):
    agent: Optional[str] = None
    message: Optional[str] = ""


class RerunPipelineRequest(BaseModel):
    agent: str
    extra_context: Optional[str] = ""


class FinalEditorRequest(BaseModel):
    article_num: int


class DeleteCollaborationLogRequest(BaseModel):
    article_num: int
    item_id: Optional[str] = None


class PublishNotionRequest(BaseModel):
    article_num: int


class FinalizeRequest(BaseModel):
    article_num: int


class AddLessonRequest(BaseModel):
    agent: str
    lesson: str


class ImportArticleRequest(BaseModel):
    article_num: int
    title: str
    content: str  # HTML from Tiptap


class SaveDraftRequest(BaseModel):
    article_num: int
    title: str
    content: str  # HTML from Tiptap


class CollaborationRequest(BaseModel):
    article_num: int
    instruction: str


class ConfirmOfficialPublishedRequest(BaseModel):
    article_num: int


class ImportPlanRequest(BaseModel):
    content: str


class GeneratePlanRequest(BaseModel):
    topic: str
    audience: Optional[str] = ""
    outcome: Optional[str] = ""
    depth: Optional[str] = ""
    channel: Optional[str] = ""
    article_count: Optional[int] = 6


def mark_completed(article_num: int):
    state = load_state()
    completed = state.get("completed", [])
    if article_num not in completed:
        completed.append(article_num)
        state["completed"] = sorted(completed)
    state["current_article"] = article_num
    save_state(state)


def mark_article_saved(article_num: int):
    state = load_state()
    completed = state.get("completed", [])
    if article_num not in completed:
        completed.append(article_num)
        state["completed"] = sorted(completed)
    state["current_article"] = article_num
    save_state(state)


def mark_article_editing(article_num: int):
    state = load_state()
    completed = state.get("completed", [])
    state["completed"] = [num for num in completed if num != article_num]
    state["current_article"] = article_num
    save_state(state)


def ensure_blank_article_shell(state: dict, article_num: int):
    article = state.setdefault("articles", {}).setdefault(str(article_num), {})
    article.setdefault("title", "")
    article.setdefault("status", "pending")


def set_current_article(article_num: int):
    state = load_state()
    ensure_blank_article_shell(state, article_num)
    state["current_article"] = article_num
    save_state(state)


def mark_official_published(article_num: int):
    state = load_state()
    completed = state.get("completed", [])
    if article_num not in completed:
        completed.append(article_num)
        state["completed"] = sorted(completed)
    next_article_num = article_num + 1
    ensure_blank_article_shell(state, next_article_num)
    state["current_article"] = next_article_num
    save_state(state)


CHINESE_DIGITS = {
    "零": 0,
    "〇": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
}


def parse_chinese_number(text: str) -> Optional[int]:
    if text.isdigit():
        return int(text)
    if text == "十":
        return 10
    if "十" in text:
        left, right = text.split("十", 1)
        tens = CHINESE_DIGITS.get(left, 1) if left else 1
        ones = CHINESE_DIGITS.get(right, 0) if right else 0
        return tens * 10 + ones
    total = 0
    for char in text:
        if char not in CHINESE_DIGITS:
            return None
        total = total * 10 + CHINESE_DIGITS[char]
    return total or None


def requested_article_num(instruction: str) -> Optional[int]:
    patterns = [
        r"(?:article|post|chapter|essay)\s*(\d+)",
        r"(?:start|write|create|draft)\s+(?:article|post|chapter|essay)?\s*(\d+)",
        r"第\s*(\d+)\s*篇",
        r"第\s*([零〇一二两三四五六七八九十]+)\s*篇",
        r"第\s*(\d+)\s*篇文章",
        r"第\s*([零〇一二两三四五六七八九十]+)\s*篇文章",
    ]
    for pattern in patterns:
        match = re.search(pattern, instruction, re.IGNORECASE)
        if match:
            return parse_chinese_number(match.group(1))
    return None


def is_start_article_instruction(instruction: str) -> bool:
    lowered = instruction.lower()
    if requested_article_num(instruction) is None:
        return False
    return any(keyword in lowered for keyword in ("start", "write", "create", "draft", "generate")) or any(
        keyword in instruction for keyword in ("开始", "启动", "新建", "写", "生成", "创作")
    )


def ensure_article_shell(article_num: int, instruction: str):
    state = load_state()
    articles = state.setdefault("articles", {})
    article = articles.setdefault(str(article_num), {})
    if article.get("official_published"):
        raise HTTPException(status_code=409, detail="This article has been published and is frozen.")

    article_plan = get_article_plan(article_num)
    if article_plan:
        article["title"] = article_plan["full_title"]
        article["planned_topic"] = article_plan["title"]
        article["planned_outline"] = article_plan["outline"]
    else:
        article.setdefault("title", f"Article {article_num:03d}")

    for key in (
        "agent_outputs",
        "draft",
        "draft_html",
        "final_draft",
        "final_integration_summary",
        "imported",
        "user_saved_final",
        "user_saved_final_at",
        "word_count",
    ):
        article.pop(key, None)

    article["status"] = "in_progress"
    collaboration = {
        "log": [],
        "active_agents": [],
        "last_instruction": instruction,
    }
    log = collaboration["log"]
    log.append({
        "id": str(uuid4()),
        "agent": "system",
        "type": "task",
        "target": "pipeline",
        "severity": "medium",
        "content": f"Received instruction: {instruction}\nCreated Article {article_num:03d} and started the writing pipeline.",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    article["collaboration"] = collaboration
    state["completed"] = [num for num in state.get("completed", []) if num != article_num]
    state["current_article"] = article_num
    save_state(state)


def reset_article_for_pipeline(article_num: int, instruction: str):
    ensure_article_shell(article_num, instruction)


def pipeline_can_be_replaced(target_article_num: int) -> bool:
    return True


def _plan_preview_response(plan: dict[int, dict]) -> dict:
    articles = [
        {
            "num": item["num"],
            "title": item["title"],
            "full_title": item["full_title"],
            "goal": item.get("goal", ""),
            "tree_position": item.get("tree_position", {}).get("path", ""),
        }
        for item in sorted(plan.values(), key=lambda row: row["num"])
    ]
    return {
        "article_count": len(articles),
        "article_numbers": [item["num"] for item in articles],
        "articles": articles,
    }


# ── State & Articles ─────────────────────────────────────────────────────────

@app.get("/api/state")
async def get_state():
    state = load_state()
    current_agent = None
    current_step = None
    if pipeline.running and pipeline.article_num and 0 <= pipeline.current_agent_index < len(AGENT_ORDER):
        current_agent = AGENT_ORDER[pipeline.current_agent_index]
        current_step = pipeline.current_agent_index + 1
    state["pipeline"] = {
        "running": pipeline.running,
        "article_num": pipeline.article_num,
        "current_agent": current_agent,
        "current_step": current_step,
        "total": len(AGENT_ORDER),
    }
    return state


@app.get("/api/articles")
async def get_articles():
    state = load_state()
    articles = state.get("articles", {})
    result = []
    for num_str, data in articles.items():
        result.append({
            "article_num": int(num_str),
            "title": data.get("title", ""),
            "status": data.get("status", "draft"),
            "completed_agents": list(data.get("agent_outputs", {}).keys()),
        })
    result.sort(key=lambda x: x["article_num"])
    return result


@app.post("/api/plans/preview")
async def preview_plan(req: ImportPlanRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Plan content is empty")
    plan = preview_article_plan_text(req.content)
    if not plan:
        raise HTTPException(
            status_code=400,
            detail="No article headings found. Use headings like '## Article 001 | Title'.",
        )
    return _plan_preview_response(plan)


@app.post("/api/plans/import")
async def import_plan(req: ImportPlanRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Plan content is empty")
    plan = preview_article_plan_text(req.content)
    if not plan:
        raise HTTPException(
            status_code=400,
            detail="No article headings found. Use headings like '## Article 001 | Title'.",
        )
    result = save_imported_plan(req.content)
    return {**result, **_plan_preview_response(plan)}


@app.post("/api/plans/generate")
async def generate_plan(req: GeneratePlanRequest):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    article_count = max(1, min(100, req.article_count or 6))
    context = {
        "article_num": 0,
        "covered_concepts": [],
        "outputs": {},
    }
    agent = PlanningAgent(ws_manager, 0, context)
    message = (
        f"Topic: {topic}\n"
        f"Audience: {req.audience or 'Not specified'}\n"
        f"Desired outcome: {req.outcome or 'Not specified'}\n"
        f"Reader depth: {req.depth or 'Not specified'}\n"
        f"Publishing channel: {req.channel or 'Not specified'}\n"
        f"Requested article count: {article_count}\n\n"
        "Create a coherent Markdown article plan in the required format. "
        "Use exactly the requested article count unless the brief makes that impossible."
    )
    content = await agent.run(message)
    plan = preview_article_plan_text(content)
    if not plan:
        raise HTTPException(
            status_code=502,
            detail="The Planning Agent response did not contain parseable article headings.",
        )
    return {
        "status": "generated",
        "content": content,
        **_plan_preview_response(plan),
    }


@app.post("/api/articles/import")
async def import_article(req: ImportArticleRequest):
    """Paste an existing article and make it the current final draft."""
    update_article(req.article_num, {
        "title": req.title,
        "draft_html": req.content,
        "final_draft": req.content,
        "agent_outputs": {"style": req.content},
        "status": "finalized",
        "imported": True,
    })
    mark_completed(req.article_num)
    return {"status": "finalized", "article_num": req.article_num}


@app.post("/api/articles/save-draft")
async def save_draft(req: SaveDraftRequest):
    """Save editor HTML as the current final draft."""
    update_article(req.article_num, {
        "title": req.title,
        "draft_html": req.content,
        "final_draft": req.content,
        "status": "finalized" if req.content.strip() else "pending",
        "user_saved_final": True,
        "user_saved_final_at": datetime.now(timezone.utc).isoformat(),
    })
    if req.content.strip():
        mark_article_saved(req.article_num)
    else:
        mark_article_editing(req.article_num)
    return {"status": "saved", "finalized": True}


@app.post("/api/articles/confirm-official-published")
async def confirm_official_published(req: ConfirmOfficialPublishedRequest):
    state = load_state()
    article_data = state.get("articles", {}).get(str(req.article_num))
    if not article_data:
        raise HTTPException(status_code=404, detail="Article not found")

    update_article(req.article_num, {
        "official_published": True,
        "official_published_at": datetime.now(timezone.utc).isoformat(),
        "status": "finalized",
        "collaboration": {
            **article_data.get("collaboration", {}),
            "frozen": True,
        },
    })
    mark_official_published(req.article_num)
    return {
        "status": "official_published",
        "article_num": req.article_num,
        "next_article_num": req.article_num + 1,
    }


# ── Collaboration ────────────────────────────────────────────────────────────

@app.post("/api/collaboration/instruct")
async def collaboration_instruct(req: CollaborationRequest):
    state = load_state()
    target_article_num = requested_article_num(req.instruction) or req.article_num
    article_data = state.get("articles", {}).get(str(target_article_num))

    if is_start_article_instruction(req.instruction):
        if pipeline.running:
            if not pipeline_can_be_replaced(target_article_num):
                raise HTTPException(status_code=409, detail="This article pipeline is already running")
            pipeline.reset()
        reset_article_for_pipeline(target_article_num, req.instruction)
        asyncio.create_task(pipeline.start(target_article_num))
        return {
            "status": "pipeline_started",
            "mode": "pipeline",
            "article_num": target_article_num,
        }

    if not article_data:
        raise HTTPException(status_code=404, detail="Article not found")
    if article_data.get("official_published"):
        raise HTTPException(status_code=409, detail="This article has been published and is frozen.")

    asyncio.create_task(run_collaboration(target_article_num, req.instruction, ws_manager))
    return {"status": "started", "mode": "collaboration", "article_num": target_article_num}


@app.delete("/api/collaboration/log")
async def delete_collaboration_log(req: DeleteCollaborationLogRequest):
    state = load_state()
    article = state.get("articles", {}).get(str(req.article_num))
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    collaboration = article.setdefault("collaboration", {})
    log = collaboration.setdefault("log", [])
    if req.item_id:
        removed_items = [item for item in log if item.get("id") == req.item_id]
        collaboration["log"] = [item for item in log if item.get("id") != req.item_id]
        remaining_agents = {item.get("agent") for item in collaboration["log"]}
        outputs = collaboration.setdefault("outputs", {})
        for item in removed_items:
            agent = item.get("agent")
            if agent and agent not in remaining_agents:
                outputs.pop(agent, None)
    else:
        collaboration["log"] = []
        collaboration["outputs"] = {}
    update_article(req.article_num, {"collaboration": collaboration})
    return {"status": "deleted", "article_num": req.article_num, "remaining": len(collaboration["log"])}


# ── Pipeline ─────────────────────────────────────────────────────────────────

@app.post("/api/pipeline/start")
async def start_pipeline(req: StartPipelineRequest):
    if pipeline.running:
        if not pipeline_can_be_replaced(req.article_num):
            raise HTTPException(status_code=409, detail="This article pipeline is already running")
        pipeline.reset()
    reset_article_for_pipeline(req.article_num, f"Top bar new task: Article {req.article_num:03d}")
    asyncio.create_task(pipeline.start(req.article_num))
    return {"status": "started", "article_num": req.article_num}


@app.post("/api/pipeline/continue")
async def continue_pipeline(req: ContinuePipelineRequest):
    if not pipeline.running:
        raise HTTPException(status_code=400, detail="Pipeline is not running")
    asyncio.create_task(pipeline.continue_pipeline(req.message or ""))
    return {"status": "continuing"}


@app.post("/api/pipeline/rerun")
async def rerun_pipeline(req: RerunPipelineRequest):
    if not pipeline.running:
        raise HTTPException(status_code=400, detail="Pipeline is not running")
    asyncio.create_task(pipeline.rerun_agent(req.agent, req.extra_context or ""))
    return {"status": "rerunning", "agent": req.agent}


@app.post("/api/pipeline/final-editor")
async def run_final_editor(req: FinalEditorRequest):
    if pipeline.running:
        raise HTTPException(status_code=409, detail="Pipeline is running. Try final integration later.")
    asyncio.create_task(pipeline.run_final_editor(req.article_num))
    return {"status": "started", "agent": "final_editor", "article_num": req.article_num}


# ── Publish ───────────────────────────────────────────────────────────────────

@app.post("/api/publish/notion")
async def publish_notion(req: PublishNotionRequest):
    state = load_state()
    article_data = state.get("articles", {}).get(str(req.article_num))
    if not article_data:
        raise HTTPException(status_code=404, detail="Article not found")

    outputs = article_data.get("agent_outputs", {})
    content = (
        article_data.get("draft_html")
        or outputs.get("style")
        or outputs.get("writer", "")
    )
    if not content:
        raise HTTPException(status_code=400, detail="Article content is empty. Finish drafting first.")

    title = article_data.get("title") or f"Article {req.article_num:03d}"

    try:
        success = await publish_to_notion(req.article_num, title, content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if success:
        update_article(req.article_num, {"notion_published": True})
        return {"status": "published", "title": title}

    raise HTTPException(status_code=500, detail="Publish failed")


@app.post("/api/publish/finalize")
async def finalize_article(req: FinalizeRequest):
    state = load_state()
    article_data = state.get("articles", {}).get(str(req.article_num))
    if not article_data:
        raise HTTPException(status_code=404, detail="Article not found")

    outputs = article_data.get("agent_outputs", {})
    if "draft_html" in article_data or "final_draft" in article_data:
        content = article_data.get("draft_html") or article_data.get("final_draft") or ""
    else:
        content = outputs.get("style") or outputs.get("writer", "")
    if not content:
        update_article(req.article_num, {
            "status": "finalized",
            "final_draft": "",
            "publish_copy": "",
        })
        return {"status": "finalized", "publish_content": ""}

    formatted = await copy_for_publish(content)
    update_article(req.article_num, {
        "status": "finalized",
        "final_draft": content,
        "publish_copy": formatted,
    })

    completed = state.get("completed", [])
    if req.article_num not in completed:
        completed.append(req.article_num)
        state["completed"] = sorted(completed)
        state["current_article"] = req.article_num
        save_state(state)

    return {"status": "finalized", "publish_content": formatted}


# ── Lessons ───────────────────────────────────────────────────────────────────

@app.get("/api/lessons")
async def get_lessons():
    from lessons import _load_all
    return _load_all()


@app.post("/api/lessons")
async def post_lesson(req: AddLessonRequest):
    add_lesson(req.agent, req.lesson)
    return {"status": "added", "agent": req.agent, "lesson": req.lesson}


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    conn_id = await ws_manager.connect(websocket)
    try:
        await ws_manager.send_to(conn_id, {
            "type": "connected",
            "conn_id": conn_id,
            "pipeline_running": pipeline.running,
            "article_num": pipeline.article_num,
        })
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")

            if action == "continue":
                user_message = msg.get("message", "")
                asyncio.create_task(pipeline.continue_pipeline(user_message))

            elif action == "rerun":
                agent_name = msg.get("agent", "")
                extra = msg.get("extra_context", "")
                asyncio.create_task(pipeline.rerun_agent(agent_name, extra))

            elif action == "ping":
                await ws_manager.send_to(conn_id, {"type": "pong"})

    except WebSocketDisconnect:
        ws_manager.disconnect(conn_id)
    except Exception:
        ws_manager.disconnect(conn_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
