from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
from youtube_transcript_api import YouTubeTranscriptApi
import aiohttp
import os

app = FastAPI()

   # CORS setup for frontend
app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173"],  # Adjust for your frontend URL
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   # Mock Murf API key (replace with your secure key)
MURF_API_KEY = "ap2_32227594-fe97-4c68-be89-83a7235febdc"  # Secure this in production (e.g., env variable)

@app.post("/api/tts")
async def tts(text: str = Form(...), language: str = Form("en-US"), voice: str = Form("male")):
       async with aiohttp.ClientSession() as session:
           async with session.post(
               "https://api.murf.ai/v1/tts",
               headers={"Authorization": f"Bearer {MURF_API_KEY}"},
               json={"text": text, "language": language, "voice": voice}
           ) as response:
               audio_data = await response.read()  # Mock for now, will stream later
               with open("temp_audio.mp3", "wb") as f:
                   f.write(audio_data)
               return {"audioUrl": "http://localhost:8000/temp_audio.mp3"}

@app.post("/api/youtube")
async def youtube_dub(url: str = Form(...), language: str = Form("en-US"), voice: str = Form("male")):
       video_id = url.split("v=")[1].split("&")[0]  # Extract video ID
       transcript = YouTubeTranscriptApi.get_transcript(video_id)
       text = " ".join([entry["text"] for entry in transcript])
       async with aiohttp.ClientSession() as session:
           async with session.post(
               "https://api.murf.ai/v1/tts",
               headers={"Authorization": f"Bearer {MURF_API_KEY}"},
               json={"text": text, "language": language, "voice": voice}
           ) as response:
               audio_data = await response.read()  # Mock for now
               with open("temp_audio.mp3", "wb") as f:
                   f.write(audio_data)
               return {"audioUrl": "http://localhost:8000/temp_audio.mp3"}

@app.post("/api/pdf")
async def pdf_narration(file: UploadFile = File(...), language: str = Form("en-US"), voice: str = Form("male")):
       with pdfplumber.open(file.file) as pdf:
           text = "".join(page.extract_text() for page in pdf.pages if page.extract_text())
       async with aiohttp.ClientSession() as session:
           async with session.post(
               "https://api.murf.ai/v1/tts",
               headers={"Authorization": f"Bearer {MURF_API_KEY}"},
               json={"text": text, "language": language, "voice": voice}
           ) as response:
               audio_data = await response.read()  # Mock for now
               with open("temp_audio.mp3", "wb") as f:
                   f.write(audio_data)
               return {"audioUrl": "http://localhost:8000/temp_audio.mp3"}

if __name__ == "__main__":
       import uvicorn
       uvicorn.run(app, host="0.0.0.0", port=8000)
