import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from manager.spec import build_spec


class RocmEnvironmentTests(unittest.TestCase):
    def spec(self):
        return build_spec({'os': 'linux', 'arch': 'x86_64', 'backend': 'rocm'})

    def test_preserves_installed_device_selection_and_resolves_amd_extras(self):
        with tempfile.TemporaryDirectory() as directory:
            device = Path(directory) / '.venv/lib/python3.12/site-packages/rocm_sdk_device_gfx1100-10.1.0.dist-info'
            device.mkdir(parents=True)
            with patch('manager.spec.venv_dir', return_value=str(Path(directory) / '.venv')):
                spec = self.spec()
            self.assertIn('torch[device-gfx1100]==2.14.0+rocm10.1.0', spec.extra_packages)
            self.assertIn('torchvision[device-gfx1100]==0.29.0a0+rocm10.1.0', spec.extra_packages)
            self.assertIn('rocm[libraries,device-gfx1100]==10.1.0', spec.extra_packages)
            self.assertIn('torchcodec==0.15.0+cpu', spec.extra_packages)
            self.assertIn('https://download.pytorch.org/whl/cpu/torchcodec/', spec.find_links)
            self.assertIn('https://stable.repo.amd.com/rocm/whl-next/triton/', spec.find_links)
            self.assertIn('https://stable.repo.amd.com/rocm/whl-next/amd-torch-device-gfx110x/', spec.find_links)
            self.assertNotIn('--index-url', spec.torch_args())
            self.assertIn('torch==2.14.0+rocm10.1.0', spec.torch_args())
            self.assertIn('torch==2.14.0+rocm10.1.0', spec.torch_constraints())

    def test_legacy_venv_directory_preserves_device_selection(self):
        with tempfile.TemporaryDirectory() as directory:
            device = Path(directory) / 'venv/lib/python3.12/site-packages/rocm_sdk_device_gfx1100-10.1.0.dist-info'
            device.mkdir(parents=True)
            with patch('manager.spec.venv_dir', return_value=str(Path(directory) / 'venv')):
                spec = self.spec()
        self.assertIn('torch[device-gfx1100]==2.14.0+rocm10.1.0', spec.extra_packages)

    def test_clean_environment_selects_all_device_kernels(self):
        with tempfile.TemporaryDirectory() as directory, patch('manager.spec.venv_dir', return_value=str(Path(directory) / '.venv')):
            spec = self.spec()
        self.assertIn('torch[device-all]==2.14.0+rocm10.1.0', spec.extra_packages)
        self.assertIn('rocm[libraries,device-all]==10.1.0', spec.extra_packages)


if __name__ == '__main__':
    unittest.main()
