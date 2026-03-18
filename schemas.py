from datetime import datetime

from pydantic import BaseModel, ConfigDict


# --- Prompt ---

class PromptCreate(BaseModel):
    name: str
    content: str


class PromptUpdate(BaseModel):
    name: str | None = None
    content: str | None = None


class PromptResponse(BaseModel):
    id: int
    name: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Version ---

class VersionCreate(BaseModel):
    content: str


class VersionResponse(BaseModel):
    id: int
    prompt_id: int
    content: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Run ---

class RunCreate(BaseModel):
    variables: dict[str, str] = {}
    model: str = "claude-opus-4-6"


class RunResponse(BaseModel):
    id: int
    prompt_id: int
    version_id: int | None
    output: str
    model: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
