import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from toolkit.config_modules import DatasetConfig, resolve_dataset_source_path


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
# therefore reject any nonempty dataset_path instead of merely replacing
# folder_path with the managed snapshot.
malicious = DatasetConfig(
    folder_path=resolved["folder_path"],
    dataset_path="/attacker/override.json",
)
effective_path = resolve_dataset_source_path(malicious)
assert effective_path == "/attacker/override.json"
print("dataset preset Python DatasetConfig compatibility passed")
