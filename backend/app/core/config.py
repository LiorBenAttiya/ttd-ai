from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    # Comma-separated list — add production domain in Azure App Configuration
    # e.g. "http://localhost:5173,https://app.lbatech.com"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str

    # Auth
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # WhatsApp
    WA_VERIFY_TOKEN: str = ""
    WA_ACCESS_TOKEN: str = ""
    WA_PHONE_NUMBER_ID: str = ""
    WA_OWNER_PHONE: str = ""
    WA_BRIDGE_URL: str = "http://localhost:3001"

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    # Microsoft Graph
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    GRAPH_REDIRECT_URI: str = ""

    # Internal service auth (wa-bridge + frontend → backend JWT)
    INTERNAL_SERVICE_KEY: str = ""

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WA_NUMBER: str = ""

    # Azure Key Vault
    AZURE_KEY_VAULT_URL: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
