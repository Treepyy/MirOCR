'use client';
// @ts-nocheck

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DetectedNode {
  id: string;
  label: string;
  type: string;
  tip: string;
  x: number;
  y: number;
}

interface DetectedEdge {
  from: string;
  to: string;
}

interface DetectedData {
  nodes: DetectedNode[];
  edges: DetectedEdge[];
}

const CLIENT_ID = process.env.NEXT_PUBLIC_MIRO_CLIENT_ID
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI
const MIRO_AUTH_URL = `https://miro.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;

export default function MirOCRPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [detectedData, setDetectedData] = useState<DetectedData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [newBoardUrl, setNewBoardUrl] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !accessToken) {
      const exchangeToken = async () => {
        try {
          const res = await fetch('/api/auth/miro', {
            method: 'POST',
            body: JSON.stringify({ code }),
          });
          const data = await res.json();
          
          if (data.access_token) {
            setAccessToken(data.access_token);
            setIsConnected(true);
            
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          console.error("Token exchange failed", err);
        }
      };
      exchangeToken();
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, accessToken]);

const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 1. Create the local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setHasImage(true);
      setIsScanning(true);

      // 2. Prepare for API call
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        setDetectedData(data); 
        // simulateScanning(); 
        setIsScanning(false);
      } catch (error) {
        console.error("VLM Error:", error);
        setIsScanning(false);
      }
    }
  };

  const handleSyncToMiro = async () => {
    if (!detectedData) {
      console.error("No detected data available");
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch('/api/miro-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: detectedData.nodes,
          edges: detectedData.edges,
          accessToken: accessToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewBoardUrl(data.boardUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const simulateScanning = () => {
    setIsScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          return 100;
        }
        return prev + 2; // Speed of scan
      });
    }, 50);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-[#050038] font-sans">
      {/* 1. TOP NAVIGATION */}
      <nav className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white z-50">
        <div className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="w-8 h-8 bg-[#FFD02F] rounded-md flex items-center justify-center text-lg font-bold">
            M
          </div>
          <span className="text-lg font-bold tracking-tight">MirOCR</span>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
            Beta
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden">
               {/* Placeholder Avatar */}
               <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs"></div>
            </div>
          ) : (
            <a 
              href={MIRO_AUTH_URL} 
              className="px-4 py-2 text-sm font-medium text-[#4262FF] border border-[#4262FF] rounded-lg hover:bg-blue-50 transition-colors"
            >
              Sign In
            </a>
          )}
        </div>
      </nav>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* STATE A: NOT CONNECTED (The "Call to Action") */}
        {!isConnected && (
          <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
            <div className="text-6xl mb-6">🎨 ➡️ 💻</div>
            <h1 className="text-4xl font-bold mb-4 tracking-tight">Turn sketches into systems</h1>
            <p className="text-gray-500 max-w-md mb-8 text-lg">
              Connect your Miro account to let our VLM Architect analyze your handwritten diagrams and build them instantly on your board.
            </p>
            <a 
              href={MIRO_AUTH_URL} 
              className="bg-[#4262FF] hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <span>Connect Miro Account</span>
            </a>
            <p className="text-xs text-gray-400 mt-4">Requires <b>boards:write</b> permission</p>
          </div>
        )}

        {/* STATE B: CONNECTED & WORKSPACE */}
        {isConnected && (
          <>
            {/* Sidebar Tools */}
            <aside className="w-16 border-r border-gray-200 flex flex-col items-center pt-6 gap-2 bg-white z-40">
              {['Image'].map((icon, i) => (
                <button key={i} className={`p-3 rounded-lg hover:bg-gray-100 transition-colors ${i === 0 ? 'bg-blue-50 text-[#4262FF]' : 'text-gray-500'}`}>
                  {/* Using generic SVG placeholders for icons to avoid external deps */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                </button>
              ))}
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 bg-[#F9F9F9] relative flex items-center justify-center p-8">
              
              {!hasImage ? (
                // Upload Zone
                <div className="w-full max-w-2xl">
                  <input 
                    type="file" 
                    id="file-upload" 
                    className="hidden" 
                    onChange={handleUpload} 
                    accept="image/*"
                  />
                  <label 
                    htmlFor="file-upload" 
                    className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-[#4262FF] transition-all group bg-white"
                  >
                    <div className="w-16 h-16 bg-blue-50 text-[#4262FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900">Upload System Sketch</h3>
                      <p className="text-gray-500 mt-1">Supports JPG, PNG from standard notebooks</p>
                    </div>
                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm group-hover:shadow-md transition-shadow">
                      Browse Files
                    </span>
                  </label>
                </div>
              ) : (
                // Image Preview & Scanning HUD
                <div className="relative w-full max-w-4xl h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
                  {/* --- THE LIVE PREVIEW --- */}
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
                    {previewUrl && (
                      <img 
                        src={previewUrl} 
                        alt="Sketch Preview" 
                        className="w-full h-full object-contain transition-opacity duration-500" 
                        style={{ opacity: isScanning ? 0.6 : 1 }}
                      />
                    )}
                    {/* Simulated Bounding Boxes (Only show when NOT scanning) */}
                    {!isScanning && detectedData && detectedData.nodes.map((node: any) => (
                      <div 
                        key={node.id}
                        className="absolute border-2 border-[#4262FF] rounded bg-[#4262FF]/10 shadow-[0_0_0_4px_rgba(66,98,255,0.2)]"
                        style={{ 
                          top: `${node.y / 10}%`, // Adjust based on Gemini's 0-1000 scale
                          left: `${node.x / 10}%`, 
                          width: '100px', 
                          height: '60px' 
                        }}
                      >
                        <div className="absolute -top-6 left-0 bg-[#4262FF] text-white text-[10px] px-2 py-0.5 rounded font-mono whitespace-nowrap">
                          {node.label}
                        </div>
                      </div>
                    ))}

                    {/* Scanning Overlay */}
                    {isScanning && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {/* The Bouncing Line */}
                      <div className="absolute w-full h-1.5 bg-[#4262FF] shadow-[0_0_20px_#4262FF] animate-scan" />
                      
                      {/* Subtle Gradient Glow that follows the scan */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#4262FF]/5 to-transparent animate-scan" />

                      {/* Status Indicator */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#050038] text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                        </div>
                        <span className="text-sm font-bold tracking-wider uppercase">Analyzing Sketch...</span>
                      </div>
                    </div>
                  )}
                  </div>

                  {/* Floating Action Bar */}
                  {hasImage && !isScanning && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-xl shadow-xl border border-gray-200 flex items-center gap-3">
                    {newBoardUrl ? (
                      <a 
                        href={newBoardUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-[#4262FF] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"
                      >
                        <span>Open New Miro Board</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    ) : (
                      <>
                      <button 
                        onClick={handleSyncToMiro}
                        disabled={isSyncing}
                        className="bg-[#4262FF] hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {isSyncing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Generating Board...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span>Sync to New Board</span>
                          </>
                        )}
                      </button>
                      <div className="w-px h-6 bg-gray-200 mx-1" />
                      <span className="text-xs text-gray-400 font-medium px-1">{detectedData?.nodes.length || 0} Components Detected</span>
                      </>
                    )}
                  </div>
                )}
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}