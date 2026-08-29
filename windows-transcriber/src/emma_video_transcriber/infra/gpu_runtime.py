from __future__ import annotations

import ctypes
import hashlib
import json
import os
import platform
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Literal

from .paths import gpu_runtime_root

GpuStatus = Literal["not_available", "missing", "downloading", "ready", "failure"]


@dataclass(frozen=True)
class GpuRuntimeState:
    status: GpuStatus
    progress: int
    message: str
    path: Path | None = None
    error: str | None = None


@dataclass(frozen=True)
class ComputeDevice:
    device: Literal["cuda", "cpu"]
    reason: str
    gpu: GpuRuntimeState


GpuProgressCallback = Callable[[GpuRuntimeState], None]


@dataclass(frozen=True)
class _NvidiaPackage:
    project: str
    version: str
    filename: str
    sha256: str


# Official NVIDIA Windows wheels. They are intentionally NOT bundled in the EXE.
# They are downloaded once, hash-verified, and only their runtime DLLs are extracted.
_PACKAGES = (
    _NvidiaPackage(
        "nvidia-cuda-runtime-cu12",
        "12.9.79",
        "nvidia_cuda_runtime_cu12-12.9.79-py3-none-win_amd64.whl",
        "8e018af8fa02363876860388bd10ccb89eb9ab8fb0aa749aaf58430a9f7c4891",
    ),
    _NvidiaPackage(
        "nvidia-cublas-cu12",
        "12.9.2.10",
        "nvidia_cublas_cu12-12.9.2.10-py3-none-win_amd64.whl",
        "623f43027d40d44ceadf0043f002bd25cf353e8f13ce90b9a87057019f560661",
    ),
    _NvidiaPackage(
        "nvidia-cudnn-cu12",
        "9.24.0.43",
        "nvidia_cudnn_cu12-9.24.0.43-py3-none-win_amd64.whl",
        "cbd41a0ab084422c936dc9fb2fc89be5ea9a85bc421c6f23d0243bdfc945fbef",
    ),
)
_RUNTIME_ID = "cuda12-cudnn9-v1"
_REQUIRED_DLLS = ("cudart64_12.dll", "cublas64_12.dll", "cublasLt64_12.dll", "cudnn64_9.dll")
_DLL_DIRECTORY_HANDLES: list[object] = []
_DLL_LOAD_HANDLES: list[object] = []


def _emit(callback: GpuProgressCallback | None, state: GpuRuntimeState) -> None:
    if callback:
        callback(state)


def _runtime_dir(root: Path | None = None) -> Path:
    base = root or gpu_runtime_root()
    return base / _RUNTIME_ID


def _bin_dir(root: Path | None = None) -> Path:
    return _runtime_dir(root) / "bin"


def nvidia_driver_present() -> bool:
    if platform.system() != "Windows":
        return False
    try:
        ctypes.WinDLL("nvcuda.dll")
        return True
    except OSError:
        pass
    nvidia_smi = shutil.which("nvidia-smi.exe") or shutil.which("nvidia-smi")
    if not nvidia_smi:
        return False
    try:
        result = subprocess.run(
            [nvidia_smi, "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        return result.returncode == 0 and bool(result.stdout.strip())
    except OSError:
        return False


def _is_complete(bin_dir: Path) -> bool:
    return all((bin_dir / dll).is_file() for dll in _REQUIRED_DLLS)


def activate_gpu_runtime(root: Path | None = None) -> bool:
    """Put the app-owned NVIDIA DLL directory on the current process search path."""
    bin_dir = _bin_dir(root)
    if not _is_complete(bin_dir):
        return False
    path = str(bin_dir)
    current = os.environ.get("PATH", "")
    entries = current.split(os.pathsep) if current else []
    if path not in entries:
        os.environ["PATH"] = path + (os.pathsep + current if current else "")
    if os.name == "nt" and hasattr(os, "add_dll_directory"):
        # Keep the handle alive for the entire process; otherwise Python removes the
        # directory from the DLL search path when the handle is garbage-collected.
        _DLL_DIRECTORY_HANDLES.append(os.add_dll_directory(path))
    return True


def _validate_dll_loads(root: Path | None = None) -> None:
    if platform.system() != "Windows":
        raise RuntimeError("CUDA runtime validation is only available on Windows")
    if not activate_gpu_runtime(root):
        raise RuntimeError("NVIDIA runtime DLLs are incomplete")
    bin_dir = _bin_dir(root)
    # Load the concrete app-local files. This catches missing transitive DLLs and
    # driver/runtime incompatibility earlier than a long transcription job.
    for dll in _REQUIRED_DLLS:
        _DLL_LOAD_HANDLES.append(ctypes.WinDLL(str(bin_dir / dll)))


def validate_gpu_runtime(root: Path | None = None) -> GpuRuntimeState:
    runtime_dir = _runtime_dir(root)
    if not nvidia_driver_present():
        return GpuRuntimeState("not_available", 0, "NVIDIA GPU driver not available", path=runtime_dir)
    if not _is_complete(_bin_dir(root)):
        return GpuRuntimeState("missing", 0, "NVIDIA runtime download required", path=runtime_dir)
    try:
        _validate_dll_loads(root)
        import ctranslate2

        count = int(ctranslate2.get_cuda_device_count())
        if count < 1:
            raise RuntimeError("CTranslate2 reports no usable CUDA device")
        return GpuRuntimeState("ready", 100, "NVIDIA runtime ready", path=runtime_dir)
    except Exception as exc:
        return GpuRuntimeState(
            "failure",
            0,
            "NVIDIA runtime cannot initialize; CPU mode remains available",
            path=runtime_dir,
            error=str(exc),
        )


def gpu_runtime_state(root: Path | None = None) -> GpuRuntimeState:
    """Cheap startup state check. Use validate_gpu_runtime before selecting CUDA."""
    runtime_dir = _runtime_dir(root)
    if not nvidia_driver_present():
        return GpuRuntimeState("not_available", 0, "NVIDIA GPU driver not available", path=runtime_dir)
    if _is_complete(_bin_dir(root)):
        return GpuRuntimeState("ready", 100, "NVIDIA runtime files present", path=runtime_dir)
    return GpuRuntimeState("missing", 0, "NVIDIA runtime download required", path=runtime_dir)


def _fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "EmmaVideoTranscriber/0.1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def _wheel_url(package: _NvidiaPackage) -> str:
    metadata = _fetch_json(f"https://pypi.org/pypi/{package.project}/{package.version}/json")
    for item in metadata.get("urls", []):
        if item.get("filename") != package.filename:
            continue
        digest = item.get("digests", {}).get("sha256")
        if digest != package.sha256:
            raise RuntimeError(f"PyPI hash mismatch for {package.filename}")
        return str(item["url"])
    raise RuntimeError(f"Pinned NVIDIA wheel not found on PyPI: {package.filename}")


def _download(url: str, destination: Path, expected_sha256: str, on_bytes: Callable[[int, int], None]) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "EmmaVideoTranscriber/0.1"})
    digest = hashlib.sha256()
    with urllib.request.urlopen(request, timeout=120) as response, destination.open("wb") as output:
        total = int(response.headers.get("Content-Length") or 0)
        current = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            output.write(chunk)
            digest.update(chunk)
            current += len(chunk)
            on_bytes(current, total)
    actual = digest.hexdigest()
    if actual != expected_sha256:
        destination.unlink(missing_ok=True)
        raise RuntimeError(f"SHA256 verification failed for {destination.name}")


def _extract_runtime_dlls(wheel: Path, destination: Path) -> int:
    count = 0
    with zipfile.ZipFile(wheel) as archive:
        for info in archive.infolist():
            name = info.filename.replace("\\", "/")
            if not name.lower().endswith(".dll") or "/bin/" not in name.lower():
                continue
            target = destination / Path(name).name
            with archive.open(info) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
            count += 1
    return count


def ensure_gpu_runtime(
    progress: GpuProgressCallback | None = None,
    *,
    root: Path | None = None,
) -> GpuRuntimeState:
    """Provision the app-local NVIDIA runtime once, without making GPU mandatory."""
    runtime_dir = _runtime_dir(root)
    bin_dir = _bin_dir(root)
    current = gpu_runtime_state(root)
    if current.status == "not_available":
        _emit(progress, current)
        return current
    if current.status == "ready":
        validated = validate_gpu_runtime(root)
        _emit(progress, validated)
        return validated

    runtime_dir.mkdir(parents=True, exist_ok=True)
    bin_dir.mkdir(parents=True, exist_ok=True)
    _emit(progress, GpuRuntimeState("downloading", 0, "Downloading NVIDIA runtime", path=runtime_dir))

    try:
        package_count = len(_PACKAGES)
        with tempfile.TemporaryDirectory(prefix="emma-gpu-", dir=runtime_dir) as temp_name:
            temp_dir = Path(temp_name)
            for index, package in enumerate(_PACKAGES):
                wheel = temp_dir / package.filename
                url = _wheel_url(package)
                start_pct = int(index * 100 / package_count)
                span = 100 / package_count

                def report_bytes(done: int, total: int, *, base=start_pct, width=span, project=package.project) -> None:
                    fraction = (done / total) if total > 0 else 0.0
                    pct = min(99, int(base + width * fraction))
                    _emit(
                        progress,
                        GpuRuntimeState(
                            "downloading",
                            pct,
                            f"Downloading NVIDIA runtime ({project})",
                            path=runtime_dir,
                        ),
                    )

                _download(url, wheel, package.sha256, report_bytes)
                extracted = _extract_runtime_dlls(wheel, bin_dir)
                if extracted == 0:
                    raise RuntimeError(f"No runtime DLLs found in {package.filename}")

        if not _is_complete(bin_dir):
            missing = [dll for dll in _REQUIRED_DLLS if not (bin_dir / dll).is_file()]
            raise RuntimeError(f"NVIDIA runtime incomplete: {', '.join(missing)}")

        manifest = {
            "runtime_id": _RUNTIME_ID,
            "packages": [
                {"project": p.project, "version": p.version, "filename": p.filename, "sha256": p.sha256}
                for p in _PACKAGES
            ],
        }
        (runtime_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

        validated = validate_gpu_runtime(root)
        if validated.status != "ready":
            _emit(progress, validated)
            return validated
        _emit(progress, validated)
        return validated
    except Exception as exc:
        state = GpuRuntimeState(
            "failure",
            0,
            "NVIDIA runtime setup failed; CPU mode remains available",
            path=runtime_dir,
            error=str(exc),
        )
        _emit(progress, state)
        return state


def select_compute_backend(
    *,
    provision: bool = False,
    progress: GpuProgressCallback | None = None,
    root: Path | None = None,
) -> ComputeDevice:
    """Return CUDA only after actual runtime validation; otherwise return CPU."""
    state = ensure_gpu_runtime(progress, root=root) if provision else validate_gpu_runtime(root)
    if state.status == "ready":
        return ComputeDevice("cuda", "Validated CTranslate2 CUDA runtime", state)
    return ComputeDevice("cpu", state.message, state)
