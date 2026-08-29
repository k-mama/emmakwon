from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace


@dataclass
class Creation:
    device: str
    compute_type: str


class FakeModel:
    def __init__(self, runtime: "FakeRuntime", device: str, compute_type: str) -> None:
        self.runtime = runtime
        self.device = device
        self.compute_type = compute_type

    def transcribe(self, _path: str, **_kwargs):
        return iter(self.runtime.next_segments()), SimpleNamespace(language="en")


class FakePipeline:
    def __init__(self, runtime: "FakeRuntime", model: FakeModel) -> None:
        self.runtime = runtime
        self.model = model

    def transcribe(self, _path: str, **kwargs):
        self.runtime.batch_sizes.append(kwargs["batch_size"])
        planned = self.runtime.next_pipeline_result()
        if isinstance(planned, BaseException):
            raise planned
        return iter(planned), SimpleNamespace(language="en")


class FakeRuntime:
    def __init__(
        self,
        *,
        cuda: bool = True,
        fail_cuda_init: bool = False,
        models: tuple[str, ...] | None = None,
    ) -> None:
        self.cuda = cuda
        self.fail_cuda_init = fail_cuda_init
        self.models = models or ("tiny", "large-v3", "large-v3-turbo", "turbo")
        self.creations: list[Creation] = []
        self.batch_sizes: list[int] = []
        self.pipeline_plan: list[object] = []
        self.standard_plan: list[object] = []

    def available_models(self):
        return self.models

    def cuda_device_count(self):
        return 1 if self.cuda else 0

    def supported_compute_types(self, device: str, _device_index: int):
        if device == "cuda":
            return {"float16", "int8_float16", "float32"}
        return {"int8", "float32"}

    def create_model(self, _model_name: str, *, device: str, compute_type: str, **_kwargs):
        self.creations.append(Creation(device, compute_type))
        if device == "cuda" and self.fail_cuda_init:
            raise RuntimeError("CUDA initialization failed")
        return FakeModel(self, device, compute_type)

    def create_batched_pipeline(self, model):
        return FakePipeline(self, model)

    def gpu_name(self, _device_index: int):
        return "Fake RTX 4070"

    def next_pipeline_result(self):
        if self.pipeline_plan:
            return self.pipeline_plan.pop(0)
        return [SimpleNamespace(start=0.0, end=1.0, text=" hello ")]

    def next_segments(self):
        if self.standard_plan:
            planned = self.standard_plan.pop(0)
            if isinstance(planned, BaseException):
                raise planned
            return planned
        return [SimpleNamespace(start=0.0, end=1.0, text=" hello ")]
