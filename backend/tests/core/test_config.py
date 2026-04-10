from core.config import Settings


def test_openai_llm_model_defaults(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    s = Settings()
    assert s.openai_llm_model == "gpt-5.4"
    assert s.openai_llm_classify_model == "gpt-5.4-mini"
    assert s.openai_llm_nano_model == "gpt-5.4-nano"


def test_openai_llm_model_overridable_from_env(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("OPENAI_LLM_CLASSIFY_MODEL", "gpt-custom")
    s = Settings()
    assert s.openai_llm_classify_model == "gpt-custom"
