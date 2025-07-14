import { useState, useRef, useEffect } from 'react';
import { Camera, QrCode, Download, Copy, Check, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import QrScanner from 'qr-scanner';

function App() {
  const [descriptorInput, setDescriptorInput] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [scannedDescriptor, setScannedDescriptor] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const decodedTextareaRef = useRef<HTMLTextAreaElement>(null);

  const generateQRCode = async () => {
    if (!descriptorInput.trim()) {
      setError('Please enter a descriptor string');
      return;
    }

    try {
      setError('');
      const encodedData = window.wasm.encode(descriptorInput);    
      const dataUrl = await QRCode.toDataURL(
        String.fromCharCode(...encodedData),
        {
        errorCorrectionLevel: 'L',
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: '#2D3748',
          light: '#FFFFFF'
        },
        width: 256
      }
      );
      setQrDataUrl(dataUrl);
      setSuccess('QR code generated successfully!');
    } catch (err) {
      setError('Failed to generate QR code. Please check your descriptor format (' + err.toString() + ')');
    }
  };

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);
      
      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found on this device');
      }

      if (videoRef.current) {
        // Stop any existing scanner first
        if (qrScannerRef.current) {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        }

        qrScannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            try {              
              if (!window.wasm) {
                throw new Error('WASM module is not ready');
              }
              
              const binaryString = result.data;
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const decodedData = window.wasm.decode(bytes);
              setScannedDescriptor(decodedData);
              setSuccess('QR code scanned successfully!');
              stopScanning();
            } catch (err) {
              console.error('Error processing scanned result:', err);
              setError('Failed to decode scanned QR code');
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment',
            maxScansPerSecond: 5
          }
        );
        
        await qrScannerRef.current.start();
        console.log('QR Scanner started successfully');
      }
    } catch (err) {
      console.error('Camera error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to access camera: ${errorMessage}. Please grant camera permissions and ensure you're using HTTPS.`);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const downloadQRCode = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = 'bitcoin-descriptor-qr.png';
    link.href = qrDataUrl;
    link.click();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (decodedTextareaRef.current) {
      decodedTextareaRef.current.style.height = 'auto';
      const newHeight = decodedTextareaRef.current.scrollHeight;
      decodedTextareaRef.current.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [scannedDescriptor]);

  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <QrCode className="w-8 h-8 text-orange-500" />
              <h1 className="text-3xl font-bold text-gray-800">Bitcoin Descriptor QR</h1>
            </div>
            <p className="text-gray-600">
              Turn your Bitcoin output descriptor into a QR code for secure storage and easy sharing
            </p>
          </div>

          {/* Error/Success Messages */}
          {(error || success) && (
            <div className="mb-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                  <button onClick={clearMessages} className="ml-auto text-red-500 hover:text-red-700">
                    ×
                  </button>
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
                  <Check className="w-5 h-5" />
                  <span>{success}</span>
                  <button onClick={clearMessages} className="ml-auto text-green-500 hover:text-green-700">
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Generate QR Code */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-orange-500" />
                Generate QR Code
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bitcoin Output Descriptor
                  </label>
                  <textarea
                    value={descriptorInput}
                    onChange={(e) => setDescriptorInput(e.target.value)}
                    placeholder="Enter your Bitcoin output descriptor..."
                    className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
                  />
                </div>
                
                <button
                  onClick={generateQRCode}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  Generate QR Code
                </button>
                
                {qrDataUrl && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 flex justify-center">
                      <img
                        src={qrDataUrl}
                        alt="Generated QR Code"
                        className="w-48 h-48 border-2 border-gray-200 rounded-lg"
                      />
                    </div>
                    <button
                      onClick={downloadQRCode}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Scan QR Code */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-500" />
                Scan QR Code
              </h2>
              
              <div className="space-y-4">
                {!isScanning ? (
                  <button
                    onClick={startScanning}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        className="w-full h-64 object-cover"
                        playsInline
                        muted
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 border-2 border-orange-500 rounded-lg bg-orange-500 bg-opacity-20"></div>
                      </div>
                    </div>
                    <button
                      onClick={stopScanning}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Stop Scanning
                    </button>
                  </div>
                )}
                
                {scannedDescriptor && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Decoded Descriptor
                      </label>
                      <div className="relative">
                        <textarea
                          ref={decodedTextareaRef}
                          value={scannedDescriptor}
                          readOnly
                          className="w-full min-h-[3rem] max-h-[12.5rem] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm overflow-y-auto resize-none"
                          style={{ height: 'auto' }}
                        />
                        <button
                          onClick={() => copyToClipboard(scannedDescriptor)}
                          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Decoded from QR code • Click copy button to copy to clipboard
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>
              Secure Bitcoin descriptor storage and sharing • 
              <span className="text-orange-500 font-medium"> Your data never leaves your device </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;