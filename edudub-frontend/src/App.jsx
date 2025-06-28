import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Moon, Sun } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import WaveSurfer from 'wavesurfer.js';
import axios from 'axios';
import { getDocument } from 'pdfjs-dist/build/pdf';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfText, setPdfText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // PDF Dropzone
  const onDrop = async (acceptedFiles) => {
     const file = acceptedFiles[0];
     setPdfFile(file);
     try {
       const arrayBuffer = await file.arrayBuffer();
       const pdf = await getDocument({ data: arrayBuffer }).promise;
       const page = await pdf.getPage(1);
       const textContent = await page.getTextContent();
       const extractedText = textContent.items.map(item => item.str).join(' ');
       setPdfText(extractedText || 'No text extracted');
      } catch (error) {
       console.error('Error loading PDF:', error);
       setPdfText('Error loading PDF');
      }
  };

const { getRootProps, getInputProps } = useDropzone({
  onDrop,
  accept: {
    'application/pdf': ['.pdf'], // Explicitly accept PDF MIME type and extension
  },
});
  const handlePdfSubmit = async () => {
  if (pdfFile) {
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('language', 'en-US');
    formData.append('voice', 'natalie');
    try {
      const response = await axios.post('http://localhost:8000/api/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Audio URL:', response.data.audioUrl); // Debug log
      setAudioUrl(response.data.audioUrl);
    } catch (error) {
      console.error('Error narrating PDF:', error);
      alert('Failed to narrate PDF. Check console for details.');
    }
  } else {
    alert('Please upload a PDF first.');
  }
};

  // Text-to-Speech Form (Mock for now)
  const handleTextSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/api/tts', {
        text: textInput,
        language: 'en-US',
        voice: 'male',
      });
      setAudioUrl(response.data.audioUrl || ''); // Mock URL for now
    } catch (error) {
      console.error('API error:', error);
      alert('Backend not available yet');
    }
  };

  // YouTube Dubbing (Mock for now)
  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (youtubeUrl.includes('youtube.com')) {
      try {
        const response = await axios.post('http://localhost:8000/api/youtube', {
          url: youtubeUrl,
          language: 'en-US',
          voice: 'male',
        });
        setAudioUrl(response.data.audioUrl || ''); // Mock URL for now
      } catch (error) {
        console.error('API error:', error);
        alert('Backend not available yet');
      }
    } else {
      alert('Please enter a valid YouTube URL');
    }
  };

  // Waveform Setup
  useEffect(() => {
  if (waveformRef.current && audioUrl) {
    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4F46E5',
      progressColor: '#3B82F6',
      cursorColor: '#ffffff',
      barWidth: 2,
      height: 100,
      cors: true, // Enable CORS for signed URLs
    });
    const loadAudio = () => {
      wavesurfer.current.load(audioUrl).then(() => {
        wavesurfer.current.play();
      }).catch((error) => {
        console.error('WaveSurfer load error:', error);
      });
    };
    loadAudio(); // Load audio after initialization
    return () => {
      if (wavesurfer.current) wavesurfer.current.destroy();
    };
  }
}, [audioUrl]); // Dependency on audioUrl to re-run when it changes


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -50 }}
        animate={{ y: 0 }}
        className="bg-glass-bg backdrop-blur-xs border-glass-border border p-4 shadow-lg"
      >
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">EduDub</h1>
          <Button onClick={toggleDarkMode} variant="outline">
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-3xl font-semibold mb-4">Welcome to EduDub</h2>
          <p className="text-lg mb-6">Dub YouTube videos, PDFs, and text in real-time for education.</p>

          {/* YouTube Dubbing */}
          <div className="bg-glass-bg backdrop-blur-xs border-glass-border border p-6 rounded-lg mb-6">
            <h3 className="text-xl font-medium mb-4">YouTube Video Dubbing</h3>
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter YouTube URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="mb-4 max-w-md mx-auto"
              />
              <Button type="submit">Start Dubbing</Button>
            </form>
          </div>

          {/* PDF Narration */}
          <div className="bg-glass-bg backdrop-blur-xs border-glass-border border p-6 rounded-lg mb-6">
            <h3 className="text-xl font-medium mb-4">PDF Narration</h3>
              <div {...getRootProps()} className="border-2 border-dashed p-4 mb-4">
                <input {...getInputProps()} />
                {pdfFile ? pdfFile.name : 'Drag and drop a PDF, or click to select'}
              </div>
              {pdfText && <p className="text-sm mb-4">{pdfText.substring(0, 200)}...</p>}
          <Button onClick={handlePdfSubmit}>Narrate PDF</Button>
        </div>

          {/* Text-to-Speech */}
          <div className="bg-glass-bg backdrop-blur-xs border-glass-border border p-6 rounded-lg">
            <h3 className="text-xl font-medium mb-4">Text-to-Speech</h3>
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <textarea
                className="w-full h-32 p-2 border rounded mb-4"
                placeholder="Enter text to narrate"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              ></textarea>
              <Button type="submit">Narrate Text</Button>
            </form>
          </div>

          {/* Audio Playback */}
          {audioUrl && (
            <div className="mt-6">
              <div ref={waveformRef} style={{ width: '100%' }} />
              <Button onClick={() => wavesurfer.current?.playPause()}>
                {wavesurfer.current?.isPlaying() ? 'Pause' : 'Play'}
              </Button>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}

export default App;