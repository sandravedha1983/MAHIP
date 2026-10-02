from pathlib import Path
import json

import torch
from torch import nn
from torchvision import models, transforms
from PIL import Image

from app.core.config import get_settings


class XRayModel:
    def __init__(self):
        settings = get_settings()

        self.model_path = Path(settings.xray_model_path)
        self.classes_path = Path(settings.xray_classes_path)

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = None
        self.classes = []

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                [0.485, 0.456, 0.406],
                [0.229, 0.224, 0.225],
            ),
        ])

    def _load(self):
        if self.model is not None:
            return

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"X-ray model not found: {self.model_path}"
            )

        if not self.classes_path.exists():
            raise FileNotFoundError(
                f"X-ray classes file not found: {self.classes_path}"
            )

        self.classes = json.loads(
            self.classes_path.read_text(encoding="utf-8")
        )

        model = models.densenet121(weights=None)

        model.classifier = nn.Linear(
            model.classifier.in_features,
            len(self.classes),
        )

        checkpoint = torch.load(
            self.model_path,
            map_location=self.device,
        )

        if isinstance(checkpoint, dict) and "model_state" in checkpoint:
            state_dict = checkpoint["model_state"]
        else:
            state_dict = checkpoint

        model.load_state_dict(state_dict)
        model.to(self.device)
        model.eval()

        self.model = model

    def predict(self, local_path: str) -> dict:
        self._load()

        image = Image.open(local_path).convert("RGB")
        tensor = self.transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probabilities = torch.softmax(logits, dim=1)
            confidence, index = torch.max(probabilities, dim=1)

        predicted_class = self.classes[index.item()]
        confidence_value = float(confidence.item())

        probabilities_dict = {
            self.classes[i]: float(probabilities[0][i].item())
            for i in range(len(self.classes))
        }

        return {
            "prediction": predicted_class,
            "confidence": round(confidence_value, 4),
            "probabilities": probabilities_dict,
            "model_status": "available",
        }


xray_model = XRayModel()