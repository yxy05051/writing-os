from collaboration import _select_agents
from state import normalize_agent_settings


def test_normalize_agent_settings_keeps_safe_defaults():
    settings = normalize_agent_settings({})

    assert settings["required_pipeline_agents"] == ["research", "structure", "writer", "final_editor"]
    assert settings["enabled_collaboration_agents"] == [
        "structure",
        "writer",
        "reader_sim",
        "fact_check",
        "style",
        "reviewer",
    ]
    assert settings["max_collaboration_agents"] == 2


def test_normalize_agent_settings_filters_unknown_agents_and_clamps_limit():
    settings = normalize_agent_settings({
        "enabled_collaboration_agents": ["reader_sim", "unknown", "growth"],
        "max_collaboration_agents": 99,
    })

    assert settings["enabled_collaboration_agents"] == ["reader_sim", "growth"]
    assert settings["max_collaboration_agents"] == 4


def test_select_agents_respects_enabled_agents_and_limit():
    settings = {
        "enabled_collaboration_agents": ["reader_sim", "reviewer"],
        "max_collaboration_agents": 1,
    }

    assert _select_agents("Review reader clarity, facts, and style.", settings) == ["reviewer"]
    assert _select_agents("读者可能看不懂这一段", settings) == ["reader_sim"]


def test_select_agents_returns_empty_when_every_matching_agent_is_disabled():
    settings = {
        "enabled_collaboration_agents": ["fact_check"],
        "max_collaboration_agents": 2,
    }

    assert _select_agents("Please improve the style and title.", settings) == []
