import asyncio
from typing import Optional
from agents.research import ResearchAgent
from agents.structure import StructureAgent
from agents.writer import WriterAgent
from agents.reader_sim import ReaderSimAgent
from agents.fact_check import FactCheckAgent
from agents.style import StyleAgent
from agents.reviewer import ReviewerAgent
from agents.growth import GrowthAgent
from agents.distributor import DistributorAgent
from agents.final_editor import FinalEditorAgent
from state import load_state, update_article, get_covered_concepts
from plan import format_article_plan_for_prompt, get_article_plan
from style_reference import build_reference_style_brief
import json

AGENT_ORDER = [
    "research",
    "structure",
    "writer",
    "final_editor",
]

OPTIONAL_AGENT_ORDER = [
    "reader_sim",
    "fact_check",
    "style",
    "reviewer",
    "growth",
    "distributor",
]

AGENT_CLASSES = {
    "research": ResearchAgent,
    "structure": StructureAgent,
    "writer": WriterAgent,
    "reader_sim": ReaderSimAgent,
    "fact_check": FactCheckAgent,
    "style": StyleAgent,
    "reviewer": ReviewerAgent,
    "growth": GrowthAgent,
    "distributor": DistributorAgent,
    "final_editor": FinalEditorAgent,
}

AGENT_LABELS = {
    "research": "Research Agent",
    "structure": "Structure Agent",
    "writer": "Writing Agent",
    "reader_sim": "Reader Simulation Agent",
    "fact_check": "Fact Check Agent",
    "style": "Style Agent",
    "reviewer": "Review Agent",
    "growth": "Growth Agent",
    "distributor": "Distribution Agent",
    "final_editor": "Final Editor Agent",
}


class Pipeline:
    def __init__(self, ws_manager):
        self.ws_manager = ws_manager
        self.article_num: Optional[int] = None
        self.current_agent_index: int = 0
        self.outputs: dict = {}
        self.running: bool = False
        self._continue_event = asyncio.Event()
        self._pending_message: str = ""
        self._rerun_agent: Optional[str] = None
        self._extra_context: str = ""
        self._run_id: int = 0

    def _build_context(self) -> dict:
        article_plan = get_article_plan(self.article_num) if self.article_num else None
        return {
            "article_num": self.article_num,
            "article_plan": article_plan,
            "covered_concepts": get_covered_concepts(),
            "outputs": self.outputs,
        }

    def reset(self):
        self.article_num = None
        self.current_agent_index = 0
        self.outputs = {}
        self.running = False
        self._pending_message = ""
        self._rerun_agent = None
        self._extra_context = ""
        self._run_id += 1

    def _build_user_message(self, agent_name: str, extra: str = "") -> str:
        parts = []
        article_plan = get_article_plan(self.article_num) if self.article_num else None
        style_reference = build_reference_style_brief(self.article_num) if self.article_num else ""

        if article_plan:
            parts.append(format_article_plan_for_prompt(article_plan))

        if agent_name in ("structure", "writer", "style", "reviewer", "final_editor") and style_reference:
            parts.append(style_reference)

        if agent_name == "research":
            parts.append(
                f"Prepare research material for Article {self.article_num}. "
                "Stay on the assigned plan. Do not replace the topic."
            )

        elif agent_name == "structure":
            research_out = self.outputs.get("research", "")
            if research_out:
                parts.append(f"Research brief:\n\n{research_out}")
            parts.append(f"\nDesign the article structure for Article {self.article_num}. Use the research brief and assigned plan.")

        elif agent_name == "writer":
            research_out = self.outputs.get("research", "")
            structure_out = self.outputs.get("structure", "")
            if research_out:
                parts.append(f"Research brief:\n\n{research_out}")
            if structure_out:
                parts.append(f"\nStructure brief:\n\n{structure_out}")
            parts.append(
                f"\nWrite the complete draft for Article {self.article_num}. Use the assigned plan title. "
                "Match the established project style when reference articles exist. "
                "Do not turn the article into a long encyclopedia entry. "
                "Assume readers may have read earlier articles, so reuse prior context where appropriate."
            )

        elif agent_name in ("reader_sim", "fact_check", "style"):
            draft = self.outputs.get("final_editor") or self.outputs.get("style") or self.outputs.get("writer", "")
            if draft:
                parts.append(f"Article content:\n\n{draft}")

        elif agent_name == "reviewer":
            draft = self.outputs.get("style") or self.outputs.get("writer", "")
            reader_feedback = self.outputs.get("reader_sim", "")
            fact_feedback = self.outputs.get("fact_check", "")
            if draft:
                parts.append(f"Article content:\n\n{draft}")
            if reader_feedback:
                parts.append(f"\nReader simulation feedback:\n\n{reader_feedback}")
            if fact_feedback:
                parts.append(f"\nFact-check feedback:\n\n{fact_feedback}")

        elif agent_name in ("growth", "distributor"):
            final = (
                self.outputs.get("final_editor")
                or self.outputs.get("style")
                or self.outputs.get("writer", "")
            )
            if final:
                parts.append(f"Article content:\n\n{final}")

        elif agent_name == "final_editor":
            source_draft = self.outputs.get("style") or self.outputs.get("writer", "")
            parts.append("PRIOR AGENT HANDOFFS")
            for key in [*AGENT_ORDER, *OPTIONAL_AGENT_ORDER]:
                if key == "final_editor":
                    continue
                value = self.outputs.get(key, "")
                if value:
                    parts.append(f"\n\n## {AGENT_LABELS.get(key, key)}\n{value}")
            if source_draft:
                parts.append(f"\n\nCURRENT DRAFT\n{source_draft}")
            parts.append(
                "\n\nIntegrate the available handoffs into a final article. "
                "Only mention agents that actually appear above. "
                "First output 【Integration Notes】, then output 【Final Draft】. "
                "The final draft should be tighter and clearer than the current draft. "
                "Match the project's established structure, depth, and rhythm when references exist."
            )

        if extra:
            parts.append(f"\n\nUSER ADDITIONAL INSTRUCTION\n{extra}")

        return "\n".join(parts)

    async def _notify(self, msg_type: str, **kwargs):
        await self.ws_manager.broadcast({"type": msg_type, **kwargs})

    async def start(self, article_num: int):
        self.article_num = article_num
        self.current_agent_index = 0
        self.outputs = {}
        self.running = True
        self._run_id += 1
        run_id = self._run_id

        article_plan = get_article_plan(article_num)
        if article_plan:
            update_article(article_num, {
                "title": article_plan["full_title"],
                "status": "in_progress",
                "planned_topic": article_plan["title"],
                "planned_outline": article_plan["outline"],
            })

        await self._notify("pipeline_started", article_num=article_num)
        while self.running and run_id == self._run_id and self.current_agent_index < len(AGENT_ORDER):
            current_agent = AGENT_ORDER[self.current_agent_index]
            completed = await self._run_current_agent(run_id=run_id)
            if not completed:
                return
            self.current_agent_index += 1

            if self.current_agent_index < len(AGENT_ORDER) and run_id == self._run_id:
                await self._notify(
                    "pipeline_handoff",
                    article_num=self.article_num,
                    from_agent=current_agent,
                    to_agent=AGENT_ORDER[self.current_agent_index],
                    step=self.current_agent_index + 1,
                    total=len(AGENT_ORDER),
                    message=f"{current_agent} delivered. Handing off to {AGENT_ORDER[self.current_agent_index]}.",
                )

        if self.running and run_id == self._run_id:
            update_article(self.article_num, {"status": "draft_ready"})
            self.running = False
            await self._notify("pipeline_done", article_num=self.article_num)

    async def _run_current_agent(self, extra_context: str = "", run_id: Optional[int] = None) -> bool:
        run_id = self._run_id if run_id is None else run_id
        if self.current_agent_index >= len(AGENT_ORDER):
            await self._notify("pipeline_done", article_num=self.article_num)
            self.running = False
            return False

        agent_name = AGENT_ORDER[self.current_agent_index]
        await self._notify("pipeline_step", agent=agent_name, step=self.current_agent_index + 1, total=len(AGENT_ORDER))

        AgentClass = AGENT_CLASSES[agent_name]
        context = self._build_context()
        agent = AgentClass(self.ws_manager, self.article_num, context)

        user_message = self._build_user_message(agent_name, extra_context)
        try:
            output = await agent.run(user_message)
        except Exception as exc:
            self.running = False
            await self._notify(
                "pipeline_error",
                agent=agent_name,
                article_num=self.article_num,
                step=self.current_agent_index + 1,
                total=len(AGENT_ORDER),
                error=str(exc),
                message=f"{agent_name} execution failed. Pipeline paused.",
            )
            return False
        if run_id != self._run_id or not self.running:
            return False

        self.outputs[agent_name] = output
        updates = {
            "agent_outputs": self.outputs,
            "status": "in_progress",
        }
        if agent_name in ("writer", "style"):
            updates["draft_html"] = output
            updates["final_draft"] = output
        if agent_name == "final_editor":
            final_draft = self._extract_final_draft(output)
            updates["draft_html"] = final_draft
            updates["final_draft"] = final_draft
            updates["final_integration_summary"] = output
        update_article(self.article_num, updates)

        await self._notify(
            "pipeline_agent_done",
            agent=agent_name,
            article_num=self.article_num,
            step=self.current_agent_index + 1,
            total=len(AGENT_ORDER),
            message="Agent delivered. Writing OS will hand off to the next agent.",
        )
        return True

    def _extract_final_draft(self, output: str) -> str:
        marker = "[Final Draft]"
        if marker in output:
            return output.split(marker, 1)[1].strip()
        return output.strip()

    async def run_final_editor(self, article_num: int):
        self.article_num = article_num
        state = load_state()
        article_data = state.get("articles", {}).get(str(article_num), {})
        self.outputs = article_data.get("agent_outputs", {})
        self.current_agent_index = AGENT_ORDER.index("final_editor")
        self.running = True
        self._run_id += 1
        run_id = self._run_id
        completed = await self._run_current_agent(run_id=run_id)
        if completed and run_id == self._run_id:
            update_article(article_num, {"status": "draft_ready"})
            self.running = False
            await self._notify("pipeline_done", article_num=article_num)

    async def continue_pipeline(self, user_message: str = ""):
        if not self.running:
            return
        self.current_agent_index += 1
        await self._run_current_agent(extra_context=user_message)

    async def rerun_agent(self, agent_name: str, extra_context: str = ""):
        if agent_name not in AGENT_CLASSES:
            await self._notify("pipeline_error", error=f"Unknown agent: {agent_name}")
            return

        all_agents = [*AGENT_ORDER, *OPTIONAL_AGENT_ORDER]
        idx = all_agents.index(agent_name)
        self.current_agent_index = idx

        AgentClass = AGENT_CLASSES[agent_name]
        context = self._build_context()
        agent = AgentClass(self.ws_manager, self.article_num, context)

        user_message = self._build_user_message(agent_name, extra_context)
        output = await agent.run(user_message)

        self.outputs[agent_name] = output
        update_article(self.article_num, {"agent_outputs": self.outputs})

        await self._notify(
            "pipeline_agent_done",
            agent=agent_name,
            step=self.current_agent_index + 1,
            total=len(all_agents),
            message="Rerun completed",
        )
