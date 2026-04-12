from openai import AsyncOpenAI

from providers.api_usage_logger import log_api_usage
from providers.cost import compute_llm_cost


class OpenAIEmbeddingsAdapter:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model
        self._dimensions = 1536

    @property
    def dimensions(self) -> int:
        return self._dimensions

    @property
    def model_id(self) -> str:
        return self._model

    async def embed(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(model=self._model, input=text)
        _usage = response.usage
        if _usage is not None:
            tokens_in = _usage.prompt_tokens or 0
            log_api_usage(
                provider="openai",
                task="embed",
                model=self._model,
                tokens_input=tokens_in,
                tokens_output=0,
                cost_usd=compute_llm_cost(self._model, tokens_in, 0),
            )
        return response.data[0].embedding  # safe: OpenAI guarantees data[0] on success

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(model=self._model, input=texts)
        _usage = response.usage
        if _usage is not None:
            tokens_in = _usage.prompt_tokens or 0
            log_api_usage(
                provider="openai",
                task="embed_batch",
                model=self._model,
                tokens_input=tokens_in,
                tokens_output=0,
                cost_usd=compute_llm_cost(self._model, tokens_in, 0),
            )
        return [item.embedding for item in response.data]
