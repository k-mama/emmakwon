from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal

from .paths import model_cache_root

DEFAULT_MODEL = "turbo"
_MODEL_REPOS = {
    "turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
    "large-v3-turbo": "mobiuslabsgmbh/faster-whisper-large-v3-turbo",
}
_ALLOW_PATTERNS = [
    "config.json",
    "preprocessor_config.json",
    "model.bin",
    "tokenizer.json",
    "vocabulary.*",
]
_REQUIRED_FILES = ("config.json", "preprocessor_config.json", "model.bin", "tokenizer.json")

ModelStatus = Literal["missing", "downloading", "ready", "failure"]


@dataclass(frozen=True)
class ModelDownloadState:
    status: ModelStatus
    progress: int
    message: str
    model_name: str
    path: Path | None = None
    error: str | None = None


ProgressCallback = Callable[[ModelDownloadState], None]


def _emit(callback: ProgressCallback | None, state: ModelDownloadState) -> None:
    if callback:
        callback(state)


def _safe_name(name: str) -> str:
    return name.replace("/", "--").replace("\\", "--")


class _NullProgressStream:
    """File-like sink for tqdm in a PyInstaller windowed process.

    In a console=False build Python sets sys.stdout/sys.stderr to None. tqdm defaults
    to sys.stderr and otherwise crashes with: 'NoneType' object has no attribute
    'write'. The real progress is surfaced through the Qt callback, so terminal
    rendering is intentionally discarded.
    """

    def write(self, value: str) -> int:
        return len(value)

    def flush(self) -> None:
        return None

    def isatty(self) -> bool:
        return False


_PROGRESS_STREAM = _NullProgressStream()


class ModelManager:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or model_cache_root()
        self.root.mkdir(parents=True, exist_ok=True)

    def repo_id(self, model_name: str) -> str:
        if "/" in model_name:
            return model_name
        try:
            return _MODEL_REPOS[model_name]
        except KeyError as exc:
            raise ValueError(f"Unsupported managed model: {model_name}") from exc

    def model_dir(self, model_name: str = DEFAULT_MODEL) -> Path:
        return self.root / _safe_name(self.repo_id(model_name))

    def is_ready(self, model_name: str = DEFAULT_MODEL) -> bool:
        path = self.model_dir(model_name)
        marker = path / ".emma-ready.json"
        return marker.is_file() and all((path / filename).is_file() for filename in _REQUIRED_FILES)

    def state(self, model_name: str = DEFAULT_MODEL) -> ModelDownloadState:
        path = self.model_dir(model_name)
        if self.is_ready(model_name):
            return ModelDownloadState("ready", 100, "Model ready", model_name, path=path)
        return ModelDownloadState("missing", 0, "Model download required", model_name, path=path)

    def ensure_model(
        self,
        model_name: str = DEFAULT_MODEL,
        progress: ProgressCallback | None = None,
    ) -> Path:
        path = self.model_dir(model_name)
        if self.is_ready(model_name):
            _emit(progress, ModelDownloadState("ready", 100, "Model ready", model_name, path=path))
            return path

        path.mkdir(parents=True, exist_ok=True)
        _emit(progress, ModelDownloadState("downloading", 0, "Downloading model", model_name, path=path))

        try:
            from huggingface_hub import snapshot_download
            from tqdm.auto import tqdm

            callback = progress

            class _ProgressTqdm(tqdm):
                def __init__(self, *args, **kwargs):
                    kwargs["file"] = _PROGRESS_STREAM
                    super().__init__(*args, **kwargs)

                def update(self, n=1):  # type: ignore[override]
                    result = super().update(n)
                    total = int(self.total or 0)
                    current = int(self.n or 0)
                    if total > 0 and getattr(self, "unit", None) == "B":
                        pct = min(99, max(0, int(current * 100 / total)))
                        _emit(
                            callback,
                            ModelDownloadState(
                                "downloading",
                                pct,
                                "Downloading model",
                                model_name,
                                path=path,
                            ),
                        )
                    return result

            snapshot_download(
                self.repo_id(model_name),
                local_dir=path,
                allow_patterns=_ALLOW_PATTERNS,
                max_workers=4,
                tqdm_class=_ProgressTqdm,
            )

            missing = [filename for filename in _REQUIRED_FILES if not (path / filename).is_file()]
            if missing:
                raise RuntimeError(f"Downloaded model is incomplete: {', '.join(missing)}")

            marker = {
                "model_name": model_name,
                "repo_id": self.repo_id(model_name),
            }
            (path / ".emma-ready.json").write_text(json.dumps(marker, indent=2), encoding="utf-8")
            _emit(progress, ModelDownloadState("ready", 100, "Model ready", model_name, path=path))
            return path
        except Exception as exc:
            _emit(
                progress,
                ModelDownloadState(
                    "failure",
                    0,
                    "Model download failed",
                    model_name,
                    path=path,
                    error=str(exc),
                ),
            )
            raise
