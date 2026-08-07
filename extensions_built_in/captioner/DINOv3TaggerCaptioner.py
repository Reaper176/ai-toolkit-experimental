"""Dataset captioner for the supported local DINOv3 tagger checkpoint."""

from collections import OrderedDict
from contextlib import nullcontext

import torch

from .BaseCaptioner import BaseCaptioner, CaptionConfig
from .dinov3_tagger.model import PATCH_SIZE, load_tagger_model, preprocess_image
from .dinov3_tagger.support import (
    CATEGORY_NAMES,
    DEFAULT_INCLUDED_CATEGORIES,
    format_tags,
    load_vocabulary,
    resolve_vocab_path,
    select_tag_indices,
    validate_checkpoint_path,
)


def _parse_bool(value, field: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized == "true":
            return True
        if normalized == "false":
            return False
    raise ValueError(f"DINOv3 {field} must be true or false")


class DINOv3TaggerConfig(CaptionConfig):
    """Validated caption-job options specific to the DINOv3 tagger."""

    def __init__(self, **kwargs):
        values = dict(kwargs)
        values["quantize"] = False
        values.setdefault("max_res", 1024)
        super().__init__(**values)

        self.quantize = False
        self.vocab_path = kwargs.get("vocab_path")
        self.selection_mode = kwargs.get("selection_mode", "threshold")
        self.threshold = kwargs.get("threshold", 0.50)
        self.top_k = kwargs.get("top_k", 30)
        included = kwargs.get("included_categories", DEFAULT_INCLUDED_CATEGORIES)
        self.use_underscores = _parse_bool(
            kwargs.get("use_underscores", False), "use_underscores"
        )
        self.escape_parentheses = _parse_bool(
            kwargs.get("escape_parentheses", False), "escape_parentheses"
        )

        if self.selection_mode not in {"threshold", "top_k"}:
            raise ValueError("DINOv3 selection_mode must be 'threshold' or 'top_k'")
        if (
            isinstance(self.threshold, bool)
            or not isinstance(self.threshold, (int, float))
            or not 0 <= self.threshold <= 1
        ):
            raise ValueError("DINOv3 threshold must be between 0 and 1")
        self.threshold = float(self.threshold)
        if (
            isinstance(self.top_k, bool)
            or not isinstance(self.top_k, int)
            or self.top_k <= 0
        ):
            raise ValueError("DINOv3 top_k must be a positive integer")
        if (
            isinstance(self.max_res, bool)
            or not isinstance(self.max_res, int)
            or self.max_res < PATCH_SIZE
        ):
            raise ValueError(
                f"DINOv3 max_res must be an integer of at least {PATCH_SIZE}"
            )
        if isinstance(included, str):
            raise ValueError("DINOv3 included_categories must be a collection")
        try:
            self.included_categories = frozenset(included)
        except TypeError as error:
            raise ValueError(
                "DINOv3 included_categories must be a collection"
            ) from error
        unknown = self.included_categories - set(CATEGORY_NAMES)
        if unknown:
            raise ValueError(
                "Unknown DINOv3 included categories: " + ", ".join(sorted(unknown))
            )


class DINOv3TaggerCaptioner(BaseCaptioner):
    caption_config_class = DINOv3TaggerConfig

    def __init__(self, process_id: int, job, config: OrderedDict, **kwargs):
        super().__init__(process_id, job, config, **kwargs)
        self.vocabulary = None

    def load_model(self):
        self.model = None
        self.vocabulary = None
        self.print_and_status_update("Validating local DINOv3 tagger files")

        checkpoint_path = validate_checkpoint_path(
            self.caption_config.model_name_or_path
        )
        vocab_path = resolve_vocab_path(checkpoint_path, self.caption_config.vocab_path)
        self.print_and_status_update("Loading DINOv3 tagger vocabulary")
        vocabulary = load_vocabulary(vocab_path)
        self.print_and_status_update("Loading DINOv3 tagger model")
        model = load_tagger_model(
            checkpoint_path,
            len(vocabulary.tags),
            device=self.device_torch,
            dtype=self.torch_dtype,
        )

        self.caption_config.model_name_or_path = checkpoint_path
        self.caption_config.vocab_path = vocab_path
        self.vocabulary = vocabulary
        self.model = model

    def _autocast_context(self):
        if self.device_torch.type == "cuda" and self.torch_dtype in {
            torch.float16,
            torch.bfloat16,
        }:
            return torch.autocast(device_type="cuda", dtype=self.torch_dtype)
        return nullcontext()

    @torch.inference_mode()
    def get_caption_for_file(self, file_path: str) -> str:
        try:
            if self.model is None or self.vocabulary is None:
                raise RuntimeError("DINOv3 tagger model and vocabulary are not loaded")
            if self.device_torch.type == "cpu" and self.torch_dtype == torch.float16:
                raise ValueError(
                    "DINOv3 CPU float16 inference is not supported; use bf16 or fp32"
                )

            pixel_values = preprocess_image(
                file_path, max_res=self.caption_config.max_res
            ).to(device=self.device_torch, dtype=self.torch_dtype)
            with self._autocast_context():
                logits = self.model(pixel_values)[0]
            scores = torch.sigmoid(logits.float()).cpu()
            indices = select_tag_indices(
                scores,
                self.vocabulary.categories,
                included_categories=self.caption_config.included_categories,
                mode=self.caption_config.selection_mode,
                threshold=self.caption_config.threshold,
                top_k=self.caption_config.top_k,
            )
            caption = format_tags(
                [self.vocabulary.tags[index] for index in indices],
                use_underscores=self.caption_config.use_underscores,
                escape_parentheses=self.caption_config.escape_parentheses,
            )
            if not caption:
                print(f"[DINOv3TaggerCaptioner] No tags selected for {file_path}")
            return caption
        except Exception as error:
            raise RuntimeError(
                f"Failed to caption image {file_path}: {error}"
            ) from error


__all__ = ["DINOv3TaggerCaptioner", "DINOv3TaggerConfig"]
