from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    ml_internal_token: str
    model_cache_seconds: int = 300
    recommendation_half_life_days: int = 90

    model_config = SettingsConfigDict(case_sensitive=False)


settings = Settings()  # type: ignore[call-arg]
