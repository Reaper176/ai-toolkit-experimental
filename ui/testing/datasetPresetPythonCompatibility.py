import sys
import tempfile
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from toolkit.config_modules import DatasetConfig, resolve_dataset_source_path
from toolkit.dataloader_mixins import MaskFileItemDTOMixin


resolved = {
    "folder_path": "/managed/dataset_presets/preset/v1/media",
    "caption_ext": "txt",
    "default_caption": "fallback",
    "caption_dropout_rate": 0.25,
    "shuffle_tokens": True,
    "num_repeats": 3,
    "resolution": [512, 768],
    "is_reg": False,
    "network_weight": 0.75,
    "cache_latents_to_disk": True,
    "flip_x": True,
    "flip_y": False,
    "num_frames": 4,
    "shrink_video_to_frames": True,
    "fps": 24,
    "auto_frame_count": False,
    "do_i2v": True,
    "do_audio": False,
    "audio_normalize": False,
    "audio_preserve_pitch": False,
    "controls": [],
    "dataset_preset": {
        "version_id": "version-1",
        "preset_id": "preset-1",
        "preset_name": "Faces",
        "version": 1,
        "manifest_sha256": "a" * 64,
    },
}

config = DatasetConfig(**resolved)
assert config.folder_path == resolved["folder_path"]
assert config.caption_ext == ".txt"
assert config.caption_dropout_rate == 0.25
assert config.shuffle_tokens is True
assert config.num_repeats == 3
assert config.resolution == [512, 768]
assert config.network_weight == 0.75
assert config.num_frames == 4
assert config.fps == 24
assert not hasattr(config, "dataset_preset")

# The Python loader treats dataset_path as the primary source and only falls
# back to folder_path when it is None. Server-side preset resolution must
# therefore reject any non-null dataset_path instead of merely replacing
# folder_path with the managed snapshot.
malicious = DatasetConfig(
    folder_path=resolved["folder_path"],
    dataset_path="/attacker/override.json",
)
effective_path = resolve_dataset_source_path(malicious)
assert effective_path == "/attacker/override.json"
for override in ["", "   "]:
    malicious = DatasetConfig(
        folder_path=resolved["folder_path"],
        dataset_path=override,
    )
    assert resolve_dataset_source_path(malicious) == override


class _LoaderBase:
    def __init__(self, *args, **kwargs):
        pass


class _MaskFixtureItem(MaskFileItemDTOMixin, _LoaderBase):
    def __init__(self, *args, **kwargs):
        self.dataset_config = kwargs["dataset_config"]
        super().__init__(*args, **kwargs)


with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    media = root / "media"
    masks = root / "masks"
    media.mkdir()
    masks.mkdir()
    first = media / "first.png"
    second = media / "second.png"
    Image.new("RGB", (2, 2), "red").save(first)
    Image.new("RGB", (2, 2), "blue").save(second)
    Image.new("L", (2, 2), 0).save(masks / "first.png")
    masked_config = DatasetConfig(
        folder_path=str(media), mask_path=str(masks), mask_min_value=0.25, invert_mask=True
    )
    first_item = _MaskFixtureItem(path=str(first), dataset_config=masked_config)
    second_item = _MaskFixtureItem(path=str(second), dataset_config=masked_config)
    assert first_item.has_mask_image is True
    assert first_item.mask_path == str(masks / "first.png")
    assert first_item.mask_min_value == 0.25
    assert first_item.dataset_config.invert_mask is True
    assert second_item.has_mask_image is False
    assert second_item.mask_path is None
print("dataset preset Python DatasetConfig compatibility passed")
