"""
OSNet (Omni-Scale Network) Feature Extractor for Person Re-Identification.
Generates 512-dimensional L2-normalized feature embeddings from full-body and torso crops.
"""
from pathlib import Path
from typing import Optional, Tuple, Union
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import MODELS_DIR

class Conv1x1(nn.Module):
    def __init__(self, in_c: int, out_c: int):
        super().__init__()
        self.conv = nn.Conv2d(in_c, out_c, 1, bias=False)
        self.bn = nn.BatchNorm2d(out_c)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.relu(self.bn(self.conv(x)))

class LiteConv3x3(nn.Module):
    """
    Depthwise-separable Lite 3x3 convolution layer used in OSNet.
    """
    def __init__(self, in_c: int, out_c: int):
        super().__init__()
        self.conv1 = nn.Conv2d(in_c, out_c, 1, bias=False)
        self.conv2 = nn.Conv2d(out_c, out_c, 3, padding=1, groups=out_c, bias=False)
        self.bn = nn.BatchNorm2d(out_c)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.conv1(x)
        return self.relu(self.bn(self.conv2(x)))

class OSBlock(nn.Module):
    """
    Omni-Scale residual block composed of multiple lite convolution streams
    with dynamic unified gating.
    """
    def __init__(self, in_c: int, out_c: int, reduction: int = 4):
        super().__init__()
        mid_c = out_c // reduction
        self.conv1 = Conv1x1(in_c, mid_c)
        self.stream1 = LiteConv3x3(mid_c, mid_c)
        self.stream2 = nn.Sequential(LiteConv3x3(mid_c, mid_c), LiteConv3x3(mid_c, mid_c))
        self.stream3 = nn.Sequential(LiteConv3x3(mid_c, mid_c), LiteConv3x3(mid_c, mid_c), LiteConv3x3(mid_c, mid_c))
        self.stream4 = nn.Sequential(LiteConv3x3(mid_c, mid_c), LiteConv3x3(mid_c, mid_c), LiteConv3x3(mid_c, mid_c), LiteConv3x3(mid_c, mid_c))
        
        self.gate = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(mid_c, mid_c, 1),
            nn.ReLU(inplace=True),
            nn.Conv2d(mid_c, mid_c, 1),
            nn.Sigmoid()
        )
        self.conv2 = Conv1x1(mid_c, out_c)
        self.shortcut = Conv1x1(in_c, out_c) if in_c != out_c else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.shortcut(x)
        feat = self.conv1(x)
        s1 = self.stream1(feat)
        s2 = self.stream2(feat)
        s3 = self.stream3(feat)
        s4 = self.stream4(feat)
        combined = s1 + s2 + s3 + s4
        gate = self.gate(combined)
        out = self.conv2(combined * gate)
        return F.relu(out + res)

class OSNet(nn.Module):
    """
    Omni-Scale Network architecture for Person Re-Identification.
    Yields 512-dimensional L2-normalized feature representation.
    """
    def __init__(self, feature_dim: int = 512):
        super().__init__()
        self.feature_dim = feature_dim
        self.stem = nn.Sequential(
            nn.Conv2d(3, 64, 7, stride=2, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(3, stride=2, padding=1)
        )
        self.stage1 = nn.Sequential(OSBlock(64, 64), OSBlock(64, 64))
        self.stage2 = nn.Sequential(OSBlock(64, 128), OSBlock(128, 128))
        self.stage3 = nn.Sequential(OSBlock(128, 256), OSBlock(256, 256))
        self.conv_head = Conv1x1(256, feature_dim)
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(feature_dim, feature_dim)
        self.bn = nn.BatchNorm1d(feature_dim)
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.BatchNorm2d) or isinstance(m, nn.BatchNorm1d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                nn.init.constant_(m.bias, 0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.conv_head(x)
        x = self.global_pool(x)
        x = x.view(x.size(0), -1)
        x = self.bn(self.fc(x))
        return F.normalize(x, p=2, dim=1)

class OSNetFeatureExtractor:
    """
    High-level feature extractor generating 512-dim embeddings for person crops.
    """
    def __init__(self, weights_path: Optional[Path] = None, device: Optional[str] = None):
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device

        self.model = OSNet(feature_dim=512)
        if weights_path and Path(weights_path).exists():
            try:
                state_dict = torch.load(str(weights_path), map_location="cpu")
                self.model.load_state_dict(state_dict, strict=False)
            except Exception:
                pass
        self.model.to(self.device)
        self.model.eval()

        # ImageNet Normalization Constants
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32).reshape(1, 1, 3)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32).reshape(1, 1, 3)

    def _preprocess(self, crop_bgr: np.ndarray, target_size: Tuple[int, int] = (256, 128)) -> torch.Tensor:
        """
        Preprocesses a BGR crop into normalized tensor [1, 3, H, W].
        """
        if crop_bgr is None or crop_bgr.size == 0:
            crop_bgr = np.zeros((target_size[0], target_size[1], 3), dtype=np.uint8)

        # Resize to standard Re-ID dimensions (256 height, 128 width)
        h, w = target_size
        resized = cv2.resize(crop_bgr, (w, h), interpolation=cv2.INTER_LINEAR)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        normalized = (rgb - self.mean) / self.std
        tensor = torch.from_numpy(normalized).permute(2, 0, 1).unsqueeze(0).to(self.device)
        return tensor

    @torch.no_grad()
    def extract_feature(self, crop_bgr: np.ndarray) -> np.ndarray:
        """
        Extracts a 512-dimensional unit-normalized feature vector from a single crop.
        """
        tensor = self._preprocess(crop_bgr)
        embedding = self.model(tensor)
        vec = embedding.cpu().numpy()[0]
        # Guarantee L2 unit normalization
        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        return vec

    def extract_pair(
        self,
        full_crop_bgr: np.ndarray,
        torso_crop_bgr: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Extracts both full-body and torso 512-dimensional embeddings.
        """
        full_vec = self.extract_feature(full_crop_bgr)
        torso_vec = self.extract_feature(torso_crop_bgr)
        return full_vec, torso_vec
