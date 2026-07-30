from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    app_name: str = "Car Damage Detector API"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_mb: int = 10
    log_level: str = "INFO"

    # Auth / rate limit
    api_key: str = ""
    rate_limit_per_hour: int = 10
    rate_limit_with_key_per_hour: int = 1000

    # Detector backend: auto | yolo | opencv | huggingface | roboflow
    detector_backend: Literal["auto", "yolo", "opencv", "huggingface", "roboflow"] = "auto"
    model_path: str = "models/car_damage_yolov8.pt"
    confidence_threshold: float = 0.25

    # Approximate real-world scale: image width corresponds to this many cm of car body
    reference_width_cm: float = 180.0

    # HuggingFace (optional)
    hf_model_id: str = "facebook/detr-resnet-50"
    hf_api_token: str = ""
    hf_api_url: str = "https://api-inference.huggingface.co/models"

    # Roboflow (optional)
    roboflow_api_key: str = ""
    roboflow_model_id: str = ""
    roboflow_version: int = 1
    roboflow_api_url: str = "https://detect.roboflow.com"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
