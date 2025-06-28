from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import pdfplumber
from youtube_transcript_api import YouTubeTranscriptApi
import aiohttp
import os
from aiofiles import open as aio_open

app = FastAPI()

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Match your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Replace with your actual Murf API key
MURF_API_KEY = "ap2_32227594-fe97-4c68-be89-83a7235febdc"  # Update this with your key

@app.post("/api/tts")
async def tts(text: str = Form(...), language: str = Form("en-US"), voice: str = Form("natalie")):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.murf.ai/v1/speech/generate",
            headers={"api-key": MURF_API_KEY},  # Changed to api-key header
            json={"text": text, "voice_id": f"en-US-{voice}"}
        ) as response:
            print(f"Murf API response status: {response.status}")
            if response.status == 200:
                result = await response.json()
                audio_url = result.get("audioFile")
                if audio_url:
                    return {"audioUrl": audio_url}
                else:
                    return JSONResponse(status_code=400, content={"error": "No audioFile URL in response"})
            else:
                error_text = await response.text()
                return JSONResponse(status_code=response.status, content={"error": f"Murf API error: {error_text}"})

@app.post("/api/youtube")
async def youtube_dub(url: str = Form(...), language: str = Form("en-US"), voice: str = Form("natalie")):
    video_id = url.split("v=")[1].split("&")[0]  # Extract video ID
    transcript = YouTubeTranscriptApi.get_transcript(video_id)
    text = " ".join([entry["text"] for entry in transcript])
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.murf.ai/v1/speech/generate",
            headers={"api-key": MURF_API_KEY},
            json={"text": text, "voice_id": f"en-US-{voice}"}
        ) as response:
            print(f"Murf API response status: {response.status}")
            if response.status == 200:
                result = await response.json()
                audio_url = result.get("audioFile")
                if audio_url:
                    return {"audioUrl": audio_url}
                else:
                    return JSONResponse(status_code=400, content={"error": "No audioFile URL in response"})
            else:
                error_text = await response.text()
                return JSONResponse(status_code=response.status, content={"error": f"Murf API error: {error_text}"})

@app.post("/api/pdf")
async def pdf_narration(file: UploadFile = File(...), language: str = Form("en-US"), voice: str = Form("natalie")):
    with pdfplumber.open(file.file) as pdf:
        text = "".join(page.extract_text() for page in pdf.pages if page.extract_text())
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.murf.ai/v1/speech/generate",
            headers={"api-key": MURF_API_KEY},
            json={"text": text, "voice_id": f"en-US-{voice}"}
        ) as response:
            print(f"Murf API response status: {response.status}")
            if response.status == 200:
                result = await response.json()
                audio_url = result.get("audioFile")
                if audio_url:
                    return {"audioUrl": audio_url}
                else:
                    return JSONResponse(status_code=400, content={"error": "No audioFile URL in response"})
            else:
                error_text = await response.text()
                return JSONResponse(status_code=response.status, content={"error": f"Murf API error: {error_text}"})

@app.get("/audio")
async def get_audio():
    # This endpoint is no longer needed
    return {"error": "Audio is now served directly from Murf API"}, 404

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
