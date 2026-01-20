import os
import json
import tempfile
import subprocess
from typing import List, Dict, Any, Optional
import modal

# Define the Modal App
app = modal.App("video-intelligence-inference")

# Define the image with necessary system and Python dependencies
image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg")
    .pip_install(
        "fastapi",
        "uvicorn",
        "requests",
        "supabase",
        "torch",
        "transformers",
        "accelerate",
        "faster-whisper",
        "numpy",
        "huggingface_hub" 
    )
)

# Define secrets (Ensure 'video-intel-secrets' is created in Modal dashboard)
secrets = [modal.Secret.from_name("video-intel-secrets")]

# Configuration
MODEL_REPO = os.environ.get("HF_MODEL_REPO", "rahuul2001/video-sentiment-meld-goemotions-v1")

# --- Helper Functions ---

def load_classifier():
    """Loads the model artifacts from Hugging Face."""
    import torch
    import torch.nn as nn
    from transformers import AutoTokenizer, AutoModel
    from huggingface_hub import hf_hub_download

    # 1. Load Configuration
    cfg_path = hf_hub_download(repo_id=MODEL_REPO, filename="config.json")
    with open(cfg_path, "r") as f:
        cfg = json.load(f)

    base_model = cfg["base_model"]
    emotions = cfg["emotions"]
    sentiments = cfg["sentiments"]

    # 2. Load Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_REPO)

    # 3. Define Model Architecture (Must match training EXACTLY)
    class MultiTaskMeldModel(nn.Module):
        def __init__(self, base_model_name, num_emotions, num_sentiments, dropout=0.1):
            super().__init__()
            self.encoder = AutoModel.from_pretrained(base_model_name)
            hidden = self.encoder.config.hidden_size
            self.dropout = nn.Dropout(dropout)
            self.emo_head = nn.Linear(hidden, num_emotions)
            self.sent_head = nn.Linear(hidden, num_sentiments)

        def forward(self, input_ids, attention_mask):
            out = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
            # Use [CLS] token representation (index 0)
            cls = self.dropout(out.last_hidden_state[:, 0, :])
            return self.emo_head(cls), self.sent_head(cls)

    # 4. Instantiate and Load Weights
    model = MultiTaskMeldModel(base_model, len(emotions), len(sentiments))
    
    weights_path = hf_hub_download(repo_id=MODEL_REPO, filename="pytorch_model.bin")
    state_dict = torch.load(weights_path, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    return {"tokenizer": tokenizer, "model": model, "cfg": cfg}

# Global variable for model caching
_classifier = None

def predict_texts(texts: List[str]):
    import torch

    global _classifier
    if _classifier is None:
        hf_token = os.environ.get("HF_TOKEN")
        if hf_token:
            os.environ["HUGGINGFACE_HUB_TOKEN"] = hf_token
        _classifier = load_classifier()

    tok = _classifier["tokenizer"]
    model = _classifier["model"]
    cfg = _classifier["cfg"]

    enc = tok(
        texts,
        padding=True,
        truncation=True,
        max_length=cfg.get("max_len", 160),
        return_tensors="pt",
    )

    with torch.no_grad():
        emo_logits, sent_logits = model(enc["input_ids"], enc["attention_mask"])
        emo_probs = torch.softmax(emo_logits, dim=-1)
        sent_probs = torch.softmax(sent_logits, dim=-1)

    # --- NEW: Calculate Global Averages ---
    # Average the probability mass across all segments
    mean_emo = emo_probs.mean(dim=0).tolist()
    mean_sent = sent_probs.mean(dim=0).tolist()

    emo_dist = {cfg["emotions"][i]: mean_emo[i] for i in range(len(cfg["emotions"]))}
    sent_dist = {cfg["sentiments"][i]: mean_sent[i] for i in range(len(cfg["sentiments"]))}
    # --------------------------------------

    emo_idx = emo_probs.argmax(dim=-1).tolist()
    sent_idx = sent_probs.argmax(dim=-1).tolist()

    out = []
    for i in range(len(texts)):
        ei = emo_idx[i]
        si = sent_idx[i]
        out.append(
            {
                "emotion": {"label": cfg["emotions"][ei], "score": float(emo_probs[i, ei])},
                "sentiment": {"label": cfg["sentiments"][si], "score": float(sent_probs[i, si])},
            }
        )
    
    # Return the list AND the distributions
    return out, emo_dist, sent_dist

def transcribe_with_faster_whisper(video_path: str) -> List[Dict[str, Any]]:
    """Transcribes video to text segments using Faster Whisper."""
    # Convert video to audio (wav)
    wav_path = video_path + ".wav"
    subprocess.run(
        ["ffmpeg", "-y", "-i", video_path, "-ar", "16000", "-ac", "1", wav_path],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    from faster_whisper import WhisperModel

    # Load model (downloads automatically on first run)
    wm = WhisperModel("small", device="cpu", compute_type="int8")
    segments, info = wm.transcribe(wav_path, vad_filter=True)

    out = []
    for s in segments:
        text = (s.text or "").strip()
        if text:
            out.append({
                "start": float(s.start),
                "end": float(s.end),
                "text": text
            })
    return out

def supabase_upload_json(bucket: str, key: str, obj: Dict[str, Any]) -> None:
    """Uploads a dictionary as a JSON file to Supabase Storage."""
    from supabase import create_client

    url = os.environ["SUPABASE_URL"]
    key_service = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(url, key_service)

    payload = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    
    # Corrected upload call for modern supabase-py
    sb.storage.from_(bucket).upload(
        path=key,
        file=payload,
        file_options={"content-type": "application/json", "upsert": "true"},
    )

def call_job_update(callback_base_url: str, body: Dict[str, Any]) -> None:
    """Sends job status updates back to the Next.js app."""
    import requests

    token = os.environ["WORKER_SHARED_SECRET"]
    resp = requests.post(
        f"{callback_base_url}/api/worker/job-update",
        headers={
            "Authorization": f"Bearer {token}", 
            "Content-Type": "application/json"
        },
        json=body,
        timeout=30,
    )
    resp.raise_for_status()

def get_signed_download_url(callback_base_url: str, storage_key: str) -> str:
    """Requests a signed download URL from the Next.js app."""
    import requests
    token = os.environ["WORKER_SHARED_SECRET"]
    
    resp = requests.post(
        f"{callback_base_url}/api/worker/signed-download",
        headers={
            "Authorization": f"Bearer {token}", 
            "Content-Type": "application/json"
        },
        json={"storageKey": storage_key},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["signedUrl"]

# --- Main Modal Function ---

@app.function(image=image, secrets=secrets, timeout=60 * 20) # 20 minute timeout
@modal.asgi_app()
def fastapi_app():
    from fastapi import FastAPI, BackgroundTasks, HTTPException
    from pydantic import BaseModel
    import requests

    web_app = FastAPI()

    class AnalyzeReq(BaseModel):
        jobId: str
        orgId: str
        videoStorageKey: str
        callbackBaseUrl: str 

    @web_app.post("/analyze")
    async def analyze(req: AnalyzeReq, background_tasks: BackgroundTasks):
        """
        Endpoint to trigger video analysis.
        """
        try:
            # 1. Notify: Job Started
            call_job_update(req.callbackBaseUrl, {"jobId": req.jobId, "status": "RUNNING", "progress": 5})

            # 2. Get Signed URL
            signed_url = get_signed_download_url(req.callbackBaseUrl, req.videoStorageKey)
            call_job_update(req.callbackBaseUrl, {"jobId": req.jobId, "status": "RUNNING", "progress": 10})

            # 3. Download Video
            with tempfile.TemporaryDirectory() as td:
                video_path = os.path.join(td, "input.mp4")
                
                # Stream download to save memory
                with requests.get(signed_url, stream=True) as r:
                    r.raise_for_status()
                    with open(video_path, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192): 
                            f.write(chunk)
                
                call_job_update(req.callbackBaseUrl, {"jobId": req.jobId, "status": "RUNNING", "progress": 20})

                # 4. Transcribe
                segments = transcribe_with_faster_whisper(video_path)
                call_job_update(req.callbackBaseUrl, {"jobId": req.jobId, "status": "RUNNING", "progress": 60})

                if not segments:
                    raise ValueError("No speech detected in video")

                # 5. Classify
                texts = [s["text"] for s in segments]
            
                # UNPACK the new return values
                preds, emo_dist, sent_dist = predict_texts(texts)
                
                utterances = []
                for seg, pr in zip(segments, preds):
                    utterances.append({**seg, **pr})

                # 6. Aggregate Results (Dominant logic stays the same)
                emo_scores = {}
                sent_scores = {}
                for u in utterances:
                    emo = u["emotion"]["label"]; es = u["emotion"]["score"]
                    sent = u["sentiment"]["label"]; ss = u["sentiment"]["score"]
                    emo_scores[emo] = emo_scores.get(emo, 0.0) + es
                    sent_scores[sent] = sent_scores.get(sent, 0.0) + ss

                dominantEmotion = max(emo_scores, key=emo_scores.get) if emo_scores else "neutral"
                dominantSentiment = max(sent_scores, key=sent_scores.get) if sent_scores else "neutral"

                total_sent = sum(sent_scores.values()) + 1e-9
                escalationRisk = float(sent_scores.get("negative", 0.0) / total_sent)

                result = {
                    "jobId": req.jobId,
                    "orgId": req.orgId,
                    "overall": {
                        "dominantEmotion": dominantEmotion,
                        "dominantSentiment": dominantSentiment,
                        "escalationRisk": escalationRisk,
                        "emotionDistribution": emo_dist,   # <--- Added
                        "sentimentDistribution": sent_dist # <--- Added
                    },
                    "utterances": utterances,
                }

                # 7. Upload Artifact
                result_key = f"org/{req.orgId}/artifacts/{req.jobId}/result.json"
                supabase_upload_json("media", result_key, result)

            # 8. Notify: Success
            call_job_update(req.callbackBaseUrl, {
                "jobId": req.jobId,
                "status": "SUCCEEDED",
                "progress": 100,
                "resultJsonKey": result_key,
            })

            return {"ok": True, "resultJsonKey": result_key}

        except Exception as e:
            # Notify: Failure
            print(f"Job failed: {e}")
            call_job_update(req.callbackBaseUrl, {
                "jobId": req.jobId,
                "status": "FAILED",
                "errorCode": "WORKER_ERROR",
                "errorMessage": str(e)
            })
            raise HTTPException(status_code=500, detail=str(e))

    return web_app