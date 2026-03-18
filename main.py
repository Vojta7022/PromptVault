from dotenv import load_dotenv

load_dotenv()

import os
from contextlib import asynccontextmanager

from anthropic import Anthropic
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import Prompt, Run, Version
from schemas import (
    PromptCreate,
    PromptResponse,
    PromptUpdate,
    RunCreate,
    RunResponse,
    VersionCreate,
    VersionResponse,
)

anthropic_client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="PromptVault", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Prompts — CRUD
# ---------------------------------------------------------------------------


@app.post("/prompts", response_model=PromptResponse, status_code=201)
def create_prompt(body: PromptCreate, db: Session = Depends(get_db)):
    prompt = Prompt(name=body.name, content=body.content)
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@app.get("/prompts", response_model=list[PromptResponse])
def list_prompts(db: Session = Depends(get_db)):
    return db.query(Prompt).all()


@app.get("/prompts/{prompt_id}", response_model=PromptResponse)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


@app.put("/prompts/{prompt_id}", response_model=PromptResponse)
def update_prompt(
    prompt_id: int, body: PromptUpdate, db: Session = Depends(get_db)
):
    prompt = db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Auto-version: snapshot the current content before overwriting it
    if body.content is not None and body.content != prompt.content:
        db.add(Version(prompt_id=prompt.id, content=prompt.content))

    if body.name is not None:
        prompt.name = body.name
    if body.content is not None:
        prompt.content = body.content

    db.commit()
    db.refresh(prompt)
    return prompt


@app.delete("/prompts/{prompt_id}", status_code=200)
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"detail": "Prompt deleted"}


# ---------------------------------------------------------------------------
# Versions
# ---------------------------------------------------------------------------


@app.get(
    "/prompts/{prompt_id}/versions", response_model=list[VersionResponse]
)
def list_versions(prompt_id: int, db: Session = Depends(get_db)):
    if db.get(Prompt, prompt_id) is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return (
        db.query(Version)
        .filter(Version.prompt_id == prompt_id)
        .order_by(Version.timestamp)
        .all()
    )


@app.post(
    "/prompts/{prompt_id}/versions",
    response_model=VersionResponse,
    status_code=201,
)
def create_version(
    prompt_id: int, body: VersionCreate, db: Session = Depends(get_db)
):
    if db.get(Prompt, prompt_id) is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    version = Version(prompt_id=prompt_id, content=body.content)
    db.add(version)
    db.commit()
    db.refresh(version)
    return version


@app.get(
    "/prompts/{prompt_id}/versions/{version_id}",
    response_model=VersionResponse,
)
def get_version(
    prompt_id: int, version_id: int, db: Session = Depends(get_db)
):
    version = (
        db.query(Version)
        .filter(Version.id == version_id, Version.prompt_id == prompt_id)
        .first()
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------


@app.post("/prompts/{prompt_id}/run", response_model=RunResponse, status_code=201)
def run_prompt(
    prompt_id: int, body: RunCreate, db: Session = Depends(get_db)
):
    prompt = db.get(Prompt, prompt_id)
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")

    # Fill in template variables — {variable_name} syntax; {{ / }} to escape braces
    try:
        filled = prompt.content.format_map(body.variables)
    except (KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=400, detail=f"Template substitution error: {exc}"
        )

    # Resolve latest version for this prompt (may be None)
    latest_version = (
        db.query(Version)
        .filter(Version.prompt_id == prompt_id)
        .order_by(Version.timestamp.desc())
        .first()
    )
    version_id = latest_version.id if latest_version else None

    # Call Anthropic and collect the full response via streaming
    with anthropic_client.messages.stream(
        model=body.model,
        max_tokens=1024,
        messages=[{"role": "user", "content": filled}],
    ) as stream:
        message = stream.get_final_message()

    output = next(
        (block.text for block in message.content if block.type == "text"), ""
    )

    run = Run(
        prompt_id=prompt_id,
        version_id=version_id,
        output=output,
        model=body.model,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
