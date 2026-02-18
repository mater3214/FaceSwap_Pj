import React, { useState, useRef, useEffect } from 'react';
import ResultPicker from './ResultPicker';
import './LiveMode.css';

const LiveMode = () => {
    const [sourceImage, setSourceImage] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [status, setStatus] = useState('Idle'); // Idle, Preparing, Live, Error
    const [pickerOpen, setPickerOpen] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const animationRef = useRef(null);

    const isLiveRef = useRef(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopLive();
        };
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSourceImage(URL.createObjectURL(file));
        setStatus('Preparing');

        // Prepare source on backend
        const formData = new FormData();
        formData.append('src', file);

        try {
            const response = await fetch('http://localhost:8000/api/live/prepare_source', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                let errMsg = 'Failed to prepare source';
                try {
                    const errData = await response.json();
                    errMsg = errData.detail || errMsg;
                } catch { /* ignore parse error */ }
                throw new Error(errMsg);
            }

            const data = await response.json();
            setSessionId(data.session_id);
            setStatus('Ready');
        } catch (error) {
            console.error(error);
            const msg = error.message.includes('unreachable') || error.message.includes('8004')
                ? 'Error: Live Service ไม่พร้อม — กรุณาเปิด live_service บน port 8004'
                : error.message.includes('fetch')
                    ? 'Error: ไม่สามารถเชื่อมต่อ Gateway — กรุณาเปิด gateway บน port 8000'
                    : `Error: ${error.message}`;
            setStatus(msg);
        }
    };

    // Handle selecting a previous result as source
    const handleResultSelect = async (file) => {
        setSourceImage(URL.createObjectURL(file));
        setStatus('Preparing');

        const formData = new FormData();
        formData.append('src', file);

        try {
            const response = await fetch('http://localhost:8000/api/live/prepare_source', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                let errMsg = 'Failed to prepare source';
                try { const d = await response.json(); errMsg = d.detail || errMsg; } catch { }
                throw new Error(errMsg);
            }
            const data = await response.json();
            setSessionId(data.session_id);
            setStatus('Ready');
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error.message}`);
        }
    };

    const startLive = async () => {
        if (!sessionId) {
            alert("Please upload a source face first.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // Connect WebSocket
            const ws = new WebSocket(`ws://localhost:8000/api/live/ws/swap?session_id=${sessionId}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("WebSocket connected");
                setIsLive(true);
                isLiveRef.current = true;
                setStatus('Live');
                processFrame();
            };

            ws.onmessage = async (event) => {
                const blob = event.data;
                const bitmap = await createImageBitmap(blob);

                // Draw result to canvas
                if (canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    // Canvas size should match video/bitmap
                    canvasRef.current.width = bitmap.width;
                    canvasRef.current.height = bitmap.height;
                    ctx.drawImage(bitmap, 0, 0);
                }

                // Continue loop
                if (isLiveRef.current) {
                    // Using requestAnimationFrame to throttle logic if needed, 
                    // but here we are driven by the response. 
                    // Ideally we send next frame only after receiving previous to avoid backlog.
                    requestAnimationFrame(processFrame);
                }
            };

            ws.onerror = (e) => {
                console.error("WebSocket error", e);
                setStatus('Error: WebSocket connection lost');
                stopLive();
            };

            ws.onclose = () => {
                console.log("WebSocket closed");
                stopLive();
            };

        } catch (err) {
            console.error("Error accessing camera", err);
            setStatus('Error: Camera access failed');
        }
    };

    const stopLive = () => {
        setIsLive(false);
        isLiveRef.current = false;
        setStatus('Idle');

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        // Clear canvas
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const processFrame = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (!videoRef.current) return;

        // Draw current video frame to a temporary canvas (or offscreen) to get blob
        // For simplicity, we can use a secondary hidden canvas or just the same logic
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth;
        tempCanvas.height = videoRef.current.videoHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        tempCanvas.toBlob((blob) => {
            if (blob && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(blob);
            }
        }, 'image/jpeg', 0.8);
    };

    // We need to kick off the loop. 
    // In strict "send-wait-receive-send" mode, `ws.onmessage` calls `processFrame`.
    // But we need the FIRST call.
    // However, `processFrame` is called in `ws.onopen`.
    // Note: React state `isLive` inside closures might be stale. 
    // It's better to rely on refs or functional updates, but since we modify `isLive` on stop,
    // we should check a ref or just rely on WS state.

    return (
        <div className="live-mode-container">


            <div className="live-content">
                <aside className="live-sidebar">
                    <div className="control-group">
                        <label>Source Face</label>
                        <div className="upload-btn" onClick={() => document.getElementById('sourceInput').click()}>
                            {sourceImage ? (
                                <img src={sourceImage} alt="Source" className="source-preview" />
                            ) : (
                                <span>Click to Upload Source</span>
                            )}
                            <input
                                id="sourceInput"
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleFileChange}
                            />
                        </div>

                        <button
                            className="action-btn"
                            onClick={() => setPickerOpen(true)}
                            style={{ marginTop: '8px', fontSize: '0.85rem', width: '100%' }}
                        >
                            Use Previous Result
                        </button>

                        <ResultPicker
                            isOpen={pickerOpen}
                            onClose={() => setPickerOpen(false)}
                            onSelect={(file) => { setPickerOpen(false); handleResultSelect(file); }}
                        />
                    </div>

                    <div className="control-group">
                        <button
                            className="action-btn btn-start"
                            onClick={startLive}
                            disabled={isLive || !sessionId}
                        >
                            Start Live
                        </button>
                        <button
                            className="action-btn btn-stop"
                            onClick={stopLive}
                            disabled={!isLive}
                        >
                            Stop
                        </button>
                    </div>
                </aside>

                <main className="live-main">
                    <div className="video-container">
                        {/* Hidden video element for raw capture */}
                        <video
                            ref={videoRef}
                            className="input-video"
                            playsInline
                            muted
                            autoPlay
                        />
                        {/* Canvas for rendering result */}
                        <canvas ref={canvasRef} className="output-canvas" />

                        {!isLive && !sourceImage && (
                            <div style={{ color: '#666' }}>Select source to begin</div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default LiveMode;
