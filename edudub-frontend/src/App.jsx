import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Moon, Sun, Loader2 } from 'lucide-react'; // Added Loader2 for spinner
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false); // New state for loader
  const waveformRef = useRef(null);
  const wavesurfer = useRef(null);
  const playbackRef = useRef(null); // Ref for playback section

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
      'application/pdf': ['.pdf'],
    },
  });

  const handlePdfSubmit = async () => {
  if (pdfFile) {
    setLoading(true); // Start loader
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('language', 'en-US');
    formData.append('voice', 'natalie');
    try {
      const response = await axios.post('http://localhost:8000/api/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Audio URL:', response.data.audioUrl);
      setAudioUrl(response.data.audioUrl);
      // Wait for DOM to update and scroll
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      if (playbackRef.current) {
        playbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        console.error('Playback ref is not available');
      }
    } catch (error) {
      console.error('Error narrating PDF:', error);
      alert('Failed to narrate PDF. Check console for details.');
    } finally {
      setLoading(false); // Stop loader
    }
  } else {
    alert('Please upload a PDF first.');
  }
};

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/api/tts', {
        text: textInput,
        language: 'en-US',
        voice: 'male',
      });
      setAudioUrl(response.data.audioUrl || '');
    } catch (error) {
      console.error('API error:', error);
      alert('Backend not available yet');
    }
  };

  const handleYoutubeSubmit = async (e) => {
    e.preventDefault();
    if (youtubeUrl.includes('youtube.com')) {
      try {
        const response = await axios.post('http://localhost:8000/api/youtube', {
          url: youtubeUrl,
          language: 'en-US',
          voice: 'male',
        });
        setAudioUrl(response.data.audioUrl || '');
      } catch (error) {
        console.error('API error:', error);
        alert('Backend not available yet');
      }
    } else {
      alert('Please enter a valid YouTube URL');
    }
  };

  useEffect(() => {
    if (waveformRef.current && audioUrl) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4F46E5',
        progressColor: '#3B82F6',
        cursorColor: '#ffffff',
        barWidth: 2,
        height: 100,
        cors: true,
      });
      const loadAudio = () => {
        wavesurfer.current.load(audioUrl).then(() => {
          wavesurfer.current.play();
          setIsPlaying(true);
        }).catch((error) => {
          console.error('WaveSurfer load error:', error);
        });
      };
      loadAudio();
      wavesurfer.current.on('pause', () => setIsPlaying(false));
      return () => {
        if (wavesurfer.current) wavesurfer.current.destroy();
      };
    }
  }, [audioUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10"
      >
        <div className="container mx-auto flex justify-between items-center">
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            EduDub
          </motion.h1>
          <Button
            onClick={toggleDarkMode}
            variant="outline"
            className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
          </Button>
        </div>
      </motion.nav>

      <main className="container mx-auto p-6 py-12">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.h2
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-4xl font-bold mb-4 text-gray-900 dark:text-white"
          >
            Welcome to EduDub
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-lg mb-8 text-gray-600 dark:text-gray-300"
          >
            Dub YouTube videos, PDFs, and text in real-time for education.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">YouTube Video Dubbing</h3>
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter YouTube URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              <Button type="submit" className="w-full max-w-md mx-auto bg-blue-600 text-white hover:bg-blue-700">
                Start Dubbing
              </Button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">PDF Narration</h3>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 mb-4 rounded-lg bg-gray-50 dark:bg-gray-700 hover:border-blue-500 transition-colors">
              <input {...getInputProps()} />
              {pdfFile ? pdfFile.name : 'Drag and drop a PDF, or click to select'}
            </div>
            {pdfText && <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">{pdfText.substring(0, 200)}...</p>}
            <Button
              onClick={handlePdfSubmit}
              className="w-full max-w-md mx-auto bg-green-600 text-white hover:bg-green-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Narrate PDF'}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
          >
            <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Text-to-Speech</h3>
            <form onSubmit={handleTextSubmit} className="space-y-4">
              <textarea
                className="w-full h-32 p-2 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter text to narrate"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              ></textarea>
              <Button type="submit" className="w-full max-w-md mx-auto bg-purple-600 text-white hover:bg-purple-700">
                Narrate Text
              </Button>
            </form>
          </motion.div>

          {/* Audio Playback */}
          {audioUrl && (
            <motion.div
              ref={playbackRef} // Ref for scrolling
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="mt-6 flex flex-col items-center space-y-4"
            >
              <div ref={waveformRef} style={{ width: '100%', maxWidth: '600px' }} className="rounded-lg overflow-hidden shadow-md" />
              <Button
                onClick={() => {
                  if (wavesurfer.current) {
                    wavesurfer.current.playPause();
                    setIsPlaying(!isPlaying);
                  }
                }}
                className={`w-full max-w-xs bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
            </motion.div>
          )}
          {loading && !audioUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50"
            >
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex items-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-2" />
                <span className="text-lg text-gray-900 dark:text-white">Processing your PDF...</span>
              </div>
            </motion.div>
          )}
        </motion.section>
      </main>
    </div>
  );
}

export default App;