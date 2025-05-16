/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {ContentUnion, GoogleGenAI, Modality} from '@google/genai';
import {
  LoaderCircle, 
  SendHorizontal, 
  Trash2, 
  X, 
  Save, 
  Download, 
  PenTool, 
  ImagePlus, 
  Eraser, 
  UndoIcon, 
  RedoIcon,
  Sliders
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

function parseError(error) {
  const regex = /{"error":(.*)}/gm;
  const m = regex.exec(error);
  try {
    const e = m[1];
    const err = JSON.parse(e);
    return err.message || error;
  } catch (e) {
    return error;
  }
}

export default function Home() {
  const canvasRef = useRef(null);
  const backgroundImageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penSize, setPenSize] = useState(5);
  const colorInputRef = useRef(null);
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser'
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  
  // Load background image when generatedImage changes
  useEffect(() => {
    if (generatedImage && canvasRef.current) {
      const img = new window.Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        drawImageToCanvas();
        
        // Save this state to history
        saveToHistory();
      };
      img.src = generatedImage;
    }
  }, [generatedImage]);

  // Initialize canvas with white background when component mounts
  useEffect(() => {
    if (canvasRef.current) {
      initializeCanvas();
      // Save initial state to drawing history
      saveToHistory();
    }
  }, []);

  // Initialize canvas with white background
  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fill canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Save current canvas state to history
  const saveToHistory = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL('image/png');
    
    // If we're not at the end of the history, remove future states
    if (historyIndex < drawingHistory.length - 1) {
      setDrawingHistory(prevHistory => prevHistory.slice(0, historyIndex + 1));
    }
    
    setDrawingHistory(prevHistory => [...prevHistory, imageData]);
    setHistoryIndex(prevIndex => prevIndex + 1);
  };

  // Undo last action
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prevIndex => prevIndex - 1);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new window.Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = drawingHistory[historyIndex - 1];
    }
  };

  // Redo last undone action
  const handleRedo = () => {
    if (historyIndex < drawingHistory.length - 1) {
      setHistoryIndex(prevIndex => prevIndex + 1);
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new window.Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = drawingHistory[historyIndex + 1];
    }
  };

  // Draw the background image to the canvas
  const drawImageToCanvas = () => {
    if (!canvasRef.current || !backgroundImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fill with white background first
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the background image
    ctx.drawImage(
      backgroundImageRef.current,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  };

  // Get the correct coordinates based on canvas scaling
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate the scaling factor between the internal canvas size and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply the scaling to get accurate coordinates
    return {
      x:
        (e.nativeEvent.offsetX ||
          e.nativeEvent.touches?.[0]?.clientX - rect.left) * scaleX,
      y:
        (e.nativeEvent.offsetY ||
          e.nativeEvent.touches?.[0]?.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const {x, y} = getCoordinates(e);

    // Prevent default behavior to avoid scrolling on touch devices
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    // Start a new path without clearing the canvas
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    // Prevent default behavior to avoid scrolling on touch devices
    if (e.type === 'touchmove') {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const {x, y} = getCoordinates(e);

    ctx.lineWidth = tool === 'eraser' ? penSize * 2 : penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (tool === 'eraser') {
      // For eraser, use destination-out compositing
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(255,255,255,1)';
    } else {
      // For pen, use normal drawing
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = penColor;
    }
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      
      // Save state to history after drawing action is complete
      setTimeout(() => saveToHistory(), 50);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Fill with white instead of just clearing
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setGeneratedImage(null);
    backgroundImageRef.current = null;
    
    // Save this cleared state to history
    saveToHistory();
  };

  const handleColorChange = (e) => {
    setPenColor(e.target.value);
    setTool('pen'); // Switch to pen tool when color is changed
  };

  const openColorPicker = () => {
    if (colorInputRef.current) {
      colorInputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      openColorPicker();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canvasRef.current) return;

    setIsLoading(true);

    try {
      // Get the drawing as base64 data
      const canvas = canvasRef.current;

      // Create a temporary canvas to add white background
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        throw new Error('Falha ao criar contexto temporário do canvas');
      }

      // Fill with white background
      tempCtx.fillStyle = '#FFFFFF';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw the original canvas content on top of the white background
      tempCtx.drawImage(canvas, 0, 0);

      const drawingData = tempCanvas.toDataURL('image/png').split(',')[1];

      // Create request payload
      const requestPayload = {
        prompt,
        drawingData,
        customApiKey, // Add the custom API key to the payload if it exists
      };

      let contents = [prompt];

      if (drawingData) {
        contents = [
          {
            role: 'USER',
            parts: [{inlineData: {data: drawingData, mimeType: 'image/png'}}],
          },
          {
            role: 'USER',
            text: `${prompt}. Keep the same minimal line doodle style.`,
          },
        ];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-preview-image-generation',
        contents,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const data = {
        success: true,
        message: '',
        imageData: null,
        error: undefined,
      };

      for (const part of response.candidates[0].content.parts) {
        // Based on the part type, either get the text or image data
        if (part.text) {
          data.message = part.text;
        } else if (part.inlineData) {
          const imageData = part.inlineData.data;
          data.imageData = imageData;
        }
      }

      if (data.success && data.imageData) {
        const imageUrl = `data:image/png;base64,${data.imageData}`;
        setGeneratedImage(imageUrl);
      } else {
        console.error('Failed to generate image:', data.error);
        setErrorMessage('Failed to generate image. Please try again.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error submitting drawing:', error);
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Close the error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
  };

  // Handle the custom API key submission
  const handleApiKeySubmit = (e) => {
    e.preventDefault();
    setShowErrorModal(false);
    // Will use the customApiKey state in the next API call
  };

  // Download the current canvas as an image
  const downloadImage = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'desenha-com-ia-drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Add touch event prevention function
  useEffect(() => {
    // Function to prevent default touch behavior on canvas
    const preventTouchDefault = (e) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    // Add event listener when component mounts
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', preventTouchDefault, {
        passive: false,
      });
      canvas.addEventListener('touchmove', preventTouchDefault, {
        passive: false,
      });
    }

    // Remove event listener when component unmounts
    return () => {
      if (canvas) {
        canvas.removeEventListener('touchstart', preventTouchDefault);
        canvas.removeEventListener('touchmove', preventTouchDefault);
      }
    };
  }, [isDrawing]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 text-gray-900 flex flex-col justify-start items-center">
        <main className="container mx-auto px-3 sm:px-6 py-3 sm:py-10 pb-24 sm:pb-32 max-w-5xl w-full">
          {/* Header section with title and tools */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-3 sm:mb-6 gap-2">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-0 leading-tight font-mega bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                desenhar com ia
              </h1>
              <p className="text-xs sm:text-base text-gray-600 mt-1">
                powered by{' '}
                <a
                  className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  href="https://ai.google.dev/"
                  target="_blank"
                  rel="noopener noreferrer">
                  Gemini 2.0
                </a>
              </p>
            </div>

            {/* Main toolbar */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={downloadImage}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors font-medium text-sm"
                title="Download drawing">
                <Download className="w-4 h-4" />
                <span>Salvar</span>
              </button>
              
              <button 
                onClick={toggleSettings}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium text-sm"
                title="Toggle settings">
                <Sliders className="w-4 h-4" />
                <span>Opções</span>
              </button>
            </div>
          </div>

          {/* Drawing tools */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {/* Tool groups */}
            <div className="flex flex-wrap sm:flex-nowrap w-full sm:w-auto gap-2">
              {/* Drawing tools group */}
              <div className="flex items-center bg-white rounded-full p-1.5 shadow-sm w-full sm:w-auto justify-center sm:justify-start">
                <button
                  type="button"
                  className={`w-12 sm:w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all ${
                    tool === 'pen' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setTool('pen')}
                  title="Pen tool">
                  <PenTool className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  className={`w-12 sm:w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-all ${
                    tool === 'eraser' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setTool('eraser')}
                  title="Eraser tool">
                  <Eraser className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  className="w-12 sm:w-9 h-9 rounded-full overflow-hidden mr-1 flex items-center justify-center border-2 shadow-sm transition-all hover:scale-105"
                  onClick={openColorPicker}
                  onKeyDown={handleKeyDown}
                  style={{backgroundColor: penColor, borderColor: tool === 'pen' ? '#9333ea' : '#e5e7eb'}}
                  title="Select color">
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={penColor}
                    onChange={handleColorChange}
                    className="opacity-0 absolute w-px h-px"
                    aria-label="Select pen color"
                  />
                </button>
              </div>

              {/* Pen size slider group */}
              <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm w-full sm:w-auto justify-center">
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">Tamanho:</span>
                <span className="text-xs font-medium text-gray-600 sm:hidden">Tam:</span>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={penSize} 
                  onChange={(e) => setPenSize(parseInt(e.target.value))}
                  className="w-24 sm:w-20 accent-purple-600"
                />
                <span className="text-xs font-medium text-gray-600">{penSize}px</span>
              </div>

              {/* History controls group */}
              <div className="flex items-center bg-white rounded-full p-1.5 shadow-sm w-full sm:w-auto justify-center">
                <button
                  type="button"
                  className="w-12 sm:w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo">
                  <UndoIcon className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  className="w-12 sm:w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  onClick={handleRedo}
                  disabled={historyIndex >= drawingHistory.length - 1}
                  title="Redo">
                  <RedoIcon className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="w-12 sm:w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                  title="Clear canvas">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Settings panel - conditionally rendered */}
          {showSettings && (
            <div className="mb-4 p-3 sm:p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Configurações avançadas</h3>
              
              <div className="mb-3">
                <label className="text-xs text-gray-600 block mb-1">API Key personalizada (opcional)</label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <input 
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="sua-api-key-do-google-ai"
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={handleApiKeySubmit}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                    Salvar API Key
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Canvas section with improved styling */}
          <div className="w-full mb-6 relative">
            <canvas
              ref={canvasRef}
              width={960}
              height={540}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="border-2 border-gray-300 rounded-xl w-full hover:cursor-crosshair sm:h-[60vh]
                h-[40vh] min-h-[250px] bg-white/90 touch-none shadow-lg"
            />
            {/* Current tool indicator */}
            <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-gray-700 shadow-sm border border-gray-200">
              {tool === 'pen' ? 'Lápis' : 'Borracha'}
            </div>
          </div>

          {/* Input form with improved design */}
          <form onSubmit={handleSubmit} className="w-full mb-6">
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Descreva o que você quer desenhar..."
                className="w-full p-3 sm:p-4 pr-16 sm:pr-20 text-sm sm:text-base border-none bg-white text-gray-800 focus:ring-2 focus:ring-purple-200 focus:outline-none transition-all"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity">
                {isLoading ? (
                  <LoaderCircle
                    className="w-4 h-4 sm:w-5 sm:h-5 animate-spin"
                    aria-label="Loading"
                  />
                ) : (
                  <SendHorizontal
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    aria-label="Submit"
                  />
                )}
              </button>
            </div>
          </form>
          
          {/* Tips section */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-700">
            <p className="font-medium mb-1">Dicas:</p>
            <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm">
              <li>Faça um desenho simples e o AI irá aprimorá-lo</li>
              <li>Seja específico no seu prompt para melhores resultados</li>
              <li>Use a borracha para corrigir erros</li>
              <li>Salve sua imagem final clicando em "Salvar"</li>
            </ul>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 w-full py-3 sm:py-4 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-500">
          desenhar com ia © 2025 - Feito com ❤️ em Angola por Liedson Habacuc
        </footer>
        
        {/* Error Modal */}
        {showErrorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-700">
                  Falha ao gerar imagem
                </h3>
                <button
                  onClick={closeErrorModal}
                  className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="font-medium text-gray-600">
                {parseError(errorMessage)}
              </p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Tente usar sua própria API Key:</p>
                <form onSubmit={handleApiKeySubmit} className="flex gap-2">
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="Sua API Key do Google AI"
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md"
                  />
                  <button 
                    type="submit"
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                    Salvar
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
