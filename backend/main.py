from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import pdfplumber
from youtube_transcript_api import YouTubeTranscriptApi
import aiohttp
import os
from aiofiles import open as aio_open
import json

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

# Fetch available voices
async def get_voices():
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://api.murf.ai/v1/speech/voices",
            headers={"api-key": MURF_API_KEY}
        ) as response:
            if response.status == 200:
                return await response.json()
            else:
                print(f"Failed to fetch voices: {response.status}")
                return {"error": f"Failed to fetch voices: {response.status}"}

@app.get("/api/voices")
async def get_available_voices():
    voices = await get_voices()
    if "error" in voices:
        return JSONResponse(status_code=500, content=voices)
    return voices

@app.post("/api/tts")
async def tts(text: str = Form(...), voice_id: str = Form("en-US-ken")):
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text input is empty or invalid"})
    payload = {"text": text, "voice_id": voice_id, "format": "mp3"}
    print(f"Sending to Murf API: {json.dumps(payload)}")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.murf.ai/v1/speech/generate",
            headers={"api-key": MURF_API_KEY},
            json=payload
        ) as response:
            print(f"Murf API response status: {response.status}")
            response_text = await response.text()
            print(f"Murf API response body: {response_text}")
            if response.status == 200:
                result = await response.json()
                audio_url = result.get("audioFile")
                if audio_url:
                    return {"audioUrl": audio_url}
                else:
                    return JSONResponse(status_code=400, content={"error": "No audioFile URL in response"})
            else:
                return JSONResponse(status_code=response.status, content={"error": f"Murf API error: {response_text}"})

@app.post("/api/youtube")
async def youtube_dub(url: str = Form(...), voice_id: str = Form(...)):
    print(f"Received request data: url={url}, voice_id={voice_id}")
    try:
        # Improved URL parsing to handle various formats
        video_id = None
        if "youtube.com/watch?v=" in url:
            video_id = url.split("v=")[1].split("&")[0]
        elif "youtu.be/" in url:
            video_id = url.split("youtu.be/")[1].split("?")[0]
        if not video_id:
            return JSONResponse(status_code=422, content={"error": "Invalid YouTube URL format", "detail": [{"loc": ["url"], "msg": "Invalid URL format", "type": "value_error"}]})
        
        print(f"Extracted video ID: {video_id}")
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        text = " ".join([entry["text"] for entry in transcript])
        if not text.strip():
            return JSONResponse(status_code=422, content={"error": "No transcript available for the video", "detail": [{"loc": ["url"], "msg": "No transcript available", "type": "value_error"}]})
    except Exception as e:
        print(f"Transcript fetch error: {str(e)}")
        return JSONResponse(status_code=422, content={"error": f"Failed to fetch transcript: {str(e)}", "detail": [{"loc": ["url"], "msg": str(e), "type": "value_error"}]})
    
    payload = {"text": text, "voice_id": voice_id, "format": "mp3"}
    print(f"Sending to Murf API: {json.dumps(payload)}")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.murf.ai/v1/speech/generate",
            headers={"api-key": MURF_API_KEY},
            json=payload
        ) as response:
            print(f"Murf API response status: {response.status}")
            response_text = await response.text()
            print(f"Murf API response body: {response_text}")
            if response.status == 200:
                result = await response.json()
                audio_url = result.get("audioFile")
                if audio_url:
                    return {"audioUrl": audio_url}
                else:
                    return JSONResponse(status_code=400, content={"error": "No audioFile URL in response"})
            else:
                return JSONResponse(status_code=response.status, content={"error": f"Murf API error: {response_text}"})

@app.post("/api/pdf")
async def pdf_narration(file: UploadFile = File(...), voice_id: str = Form("en-US-ken")):
    with pdfplumber.open(file.file) as pdf:
        text = "".join(page.extract_text() for page in pdf.pages if page.extract_text())
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "No text extracted from PDF"})
    payload = {"text": text, "voice_id": voice_id, "format": "mp3"}
    print(f"Sending to Murf API: {json.dumps(payload)}")
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.murf.ai/v1/speech/generate",
            headers={"api-key": MURF_API_KEY},
            json=payload
        ) as response:
            print(f"Murf API response status: {response.status}")
            response_text = await response.text()
            print(f"Murf API response body: {response_text}")
            if response.status == 200:
                result = await response.json()
                audio_url = result.get("audioFile")
                if audio_url:
                    return {"audioUrl": audio_url}
                else:
                    return JSONResponse(status_code=400, content={"error": "No audioFile URL in response"})
            else:
                return JSONResponse(status_code=response.status, content={"error": f"Murf API error: {response_text}"})

@app.get("/audio")
async def get_audio():
    return {"error": "Audio is now served directly from Murf API"}, 404

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
