from openai import AsyncOpenAI
from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
from lessons import get_lessons_prompt
import asyncio
import json
import re
import time


class BaseAgent:
    def __init__(self, name: str, ws_manager, article_num: int, context: dict):
        self.name = name
        self.ws_manager = ws_manager
        self.article_num = article_num
        self.context = context
        self.client = AsyncOpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
        )

    def get_system_prompt(self) -> str:
        raise NotImplementedError

    async def send_status(self, status: str):
        await self.ws_manager.broadcast({
            "type": "agent_status",
            "agent": self.name,
            "status": status,
        })

    async def send_activity(self, stage: str, message: str, started_at: float | None = None):
        payload = {
            "type": "agent_activity",
            "agent": self.name,
            "stage": stage,
            "message": message,
        }
        if started_at is not None:
            payload["elapsed_seconds"] = int(time.monotonic() - started_at)
        await self.ws_manager.broadcast(payload)

    def _model_request_kwargs(self, messages: list[dict], system_prompt: str) -> dict:
        kwargs = {
            "model": OPENAI_MODEL,
            "messages": messages,
            "stream": True,
        }

        # Some OpenAI-compatible gateways expose GPT-5-family models through a
        # chat-completions-shaped endpoint but still require a top-level
        # `instructions` field. Official chat completions ignores this path
        # because we only enable it for the configured gateway / model family.
        if "zuco" in OPENAI_BASE_URL.lower() or OPENAI_MODEL.lower().startswith("gpt-5"):
            kwargs["extra_body"] = {"instructions": system_prompt}

        return kwargs

    def _clean_error_message(self, exc: Exception) -> str:
        raw = str(exc)

        body = getattr(exc, "body", None)
        if isinstance(body, dict):
            error = body.get("error", body)
            if isinstance(error, dict) and error.get("message"):
                raw = str(error["message"])

        data_match = re.search(r"data:\s*(\{.*\})", raw, re.S)
        if data_match:
            try:
                payload = json.loads(data_match.group(1))
                error = payload.get("error", payload)
                if isinstance(error, dict) and error.get("message"):
                    raw = str(error["message"])
            except Exception:
                pass

        json_match = re.search(r"(\{.*\})", raw, re.S)
        if json_match:
            try:
                payload = json.loads(json_match.group(1))
                error = payload.get("error", payload)
                if isinstance(error, dict) and error.get("message"):
                    raw = str(error["message"])
            except Exception:
                pass

        if "Instructions are required" in raw:
            return "The model gateway requires an instructions field. Compatibility parameters were added; please retry this article."
        if "Upstream request failed" in raw or "upstream_error" in raw:
            return "The upstream model request failed. Please retry later."
        return raw.splitlines()[0][:240] or "The model request failed."

    async def run(self, user_message: str = "") -> str:
        await self.send_status("running")
        started_at = time.monotonic()
        first_chunk_seen = False
        keepalive_running = True

        system_prompt = self.get_system_prompt() + get_lessons_prompt(self.name)
        messages = [{"role": "system", "content": system_prompt}]

        if user_message:
            messages.append({"role": "user", "content": user_message})

        await self.send_activity("preparing", "Task received. Preparing prompt and context.", started_at)

        async def activity_keepalive():
            while keepalive_running and not first_chunk_seen:
                await asyncio.sleep(8)
                if keepalive_running and not first_chunk_seen:
                    await self.send_activity(
                        "waiting_model",
                        "Waiting for the first model response. If this takes a while, the gateway may be slow or queued.",
                        started_at,
                    )

        full_content = ""
        keepalive_task = asyncio.create_task(activity_keepalive())
        try:
            await self.send_activity("connecting_model", "Connecting to the model gateway.", started_at)
            stream = await self.client.chat.completions.create(
                **self._model_request_kwargs(messages, system_prompt)
            )
            await self.send_activity("streaming", "Model responded. Receiving output.", started_at)

            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta.content:
                    if not first_chunk_seen:
                        first_chunk_seen = True
                        await self.send_activity("streaming", "First output received. Streaming to the agent computer.", started_at)
                    full_content += delta.content
                    await self.ws_manager.broadcast({
                        "type": "agent_stream",
                        "agent": self.name,
                        "chunk": delta.content,
                        "done": False,
                    })

            await self.ws_manager.broadcast({
                "type": "agent_stream",
                "agent": self.name,
                "chunk": "",
                "done": True,
            })
            await self.ws_manager.broadcast({
                "type": "agent_output",
                "agent": self.name,
                "content": full_content,
            })
            await self.send_activity("done", f"Delivery complete. {len(full_content)} characters.", started_at)
            await self.send_status("done")

        except Exception as e:
            clean_error = self._clean_error_message(e)
            await self.send_status("error")
            await self.send_activity("error", clean_error, started_at)
            await self.ws_manager.broadcast({
                "type": "agent_error",
                "agent": self.name,
                "error": clean_error,
            })
            raise RuntimeError(clean_error) from e
        finally:
            keepalive_running = False
            keepalive_task.cancel()

        return full_content
