import { useState, useRef, useCallback, useEffect } from 'react';
import './CameraCapture.css';

function CameraCapture({ onCapture, onCancel }) {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

    // Initialize camera
    useEffect(() => {
        let currentStream = null;

        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user"
                    }
                });

                currentStream = mediaStream;
                setStream(mediaStream);

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.onloadedmetadata = () => {
                        setIsCameraReady(true);
                        videoRef.current.play();
                    };
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาต");
            }
        };

        startCamera();

        // Cleanup
        return () => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = useCallback(() => {
        if (!videoRef.current || !isCameraReady) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');

        // Horizontal flip for mirror effect (if needed, usually webcam feels more natural mirrored)
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                // Create a File object from the blob
                const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
            }
        }, 'image/jpeg', 0.95);
    }, [isCameraReady, onCapture]);

    return (
        <div className="camera-capture-overlay">
            <div className="camera-modal">
                <div className="camera-header">
                    <h3>Capture Photo</h3>
                    <button className="close-btn" onClick={onCancel}>×</button>
                </div>

                <div className="camera-view-container">
                    {error ? (
                        <div className="camera-error">
                            <span className="error-icon">!</span>
                            <p>{error}</p>
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="camera-video"
                        />
                    )}

                    {!isCameraReady && !error && (
                        <div className="camera-loading">
                            <div className="camera-spinner"></div>
                            <p>กำลังเปิดกล้อง...</p>
                        </div>
                    )}
                </div>

                <div className="camera-controls">
                    <button className="btn-cancel" onClick={onCancel}>
                        ยกเลิก
                    </button>
                    <button
                        className="btn-capture"
                        onClick={handleCapture}
                        disabled={!isCameraReady || !!error}
                    >
                        <div className="capture-inner"></div>
                    </button>
                    <div className="spacer"></div>
                    {/* Spacer to balance the layout if needed */}
                </div>
            </div>
        </div>
    );
}

export default CameraCapture;
