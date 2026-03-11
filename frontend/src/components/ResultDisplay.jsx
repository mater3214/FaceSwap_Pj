import { useEffect, useState } from 'react';
import './ResultDisplay.css';
import { getResultImageUrl } from '../services/api';

function ResultDisplay({
    sourceFile,
    sourceFiles = [],
    targetFile,
    resultUrl,
    onReset,
    onProceedToEdit,
    isMultiMode = false
}) {
    const hasMultipleSources = isMultiMode && sourceFiles.length > 0;

    const [sourcePreview, setSourcePreview] = useState(null);
    const [targetPreview, setTargetPreview] = useState(null);
    const [multiPreviews, setMultiPreviews] = useState([]);
    const [fetchedResultUrl, setFetchedResultUrl] = useState(null);

    // Cleanup and create source preview
    useEffect(() => {
        if (sourcePreview) URL.revokeObjectURL(sourcePreview);
        const url = sourceFile ? URL.createObjectURL(sourceFile) : null;
        setSourcePreview(url);
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [sourceFile]);

    // Cleanup and create target preview
    useEffect(() => {
        if (targetPreview) URL.revokeObjectURL(targetPreview);
        const url = targetFile ? URL.createObjectURL(targetFile) : null;
        setTargetPreview(url);
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [targetFile]);

    // Cleanup and create multi source previews
    useEffect(() => {
        multiPreviews.forEach(url => URL.revokeObjectURL(url));
        const urls = (sourceFiles || []).slice(0, 4).map(f => URL.createObjectURL(f));
        setMultiPreviews(urls);
        return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
    }, [sourceFiles]);

    // Fetch result image with Ngrok bypass header
    useEffect(() => {
        if (!resultUrl) {
            setFetchedResultUrl(null);
            return;
        }

        if (resultUrl.startsWith('blob:')) {
            setFetchedResultUrl(resultUrl);
            return;
        }

        let isMounted = true;
        const fetchImage = async () => {
            try {
                const fullUrl = getResultImageUrl(resultUrl);
                const response = await fetch(fullUrl, {
                    headers: { 'ngrok-skip-browser-warning': 'true' }
                });
                if (!response.ok) throw new Error('Failed to fetch result image');
                const blob = await response.blob();
                if (isMounted) {
                    setFetchedResultUrl(URL.createObjectURL(blob));
                }
            } catch (error) {
                console.error('Error fetching result image:', error);
            }
        };

        fetchImage();
        return () => { isMounted = false; };
    }, [resultUrl]);

    const handleDownload = () => {
        if (!fetchedResultUrl) return;
        try {
            const a = document.createElement('a');
            a.href = fetchedResultUrl;
            a.download = `facelab_result_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            alert('ดาวน์โหลดไม่สำเร็จ');
        }
    };

    return (
        <div className="result-display">
            <div className="result-header">
                <div className="success-badge">
                    <span className="success-icon">✓</span>
                    <span>สำเร็จ!</span>
                </div>
                <h2 className="result-title">ผลลัพธ์การสลับหน้า</h2>
            </div>

            {/* Hero result image — shown prominently */}
            <div className="result-hero">
                <div className="result-hero-image">
                    {fetchedResultUrl ? (
                        <img src={fetchedResultUrl} alt="Result" />
                    ) : (
                        <div className="result-loading">
                            <div className="spinner"></div>
                            <span>กำลังโหลดผลลัพธ์...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Source + Target thumbnails */}
            <div className="source-target-row">
                <div className="thumb-item">
                    <span className="thumb-label">S รูปอ้างอิง</span>
                    <div className="thumb-image">
                        {hasMultipleSources ? (
                            <div className="thumb-multi-grid">
                                {multiPreviews.map((previewUrl, index) => (
                                    <img key={index} src={previewUrl} alt={`Source ${index + 1}`} />
                                ))}
                                {sourceFiles.length > 4 && (
                                    <div className="thumb-more">+{sourceFiles.length - 4}</div>
                                )}
                            </div>
                        ) : (
                            sourcePreview && <img src={sourcePreview} alt="Source" />
                        )}
                    </div>
                </div>

                <div className="thumb-arrow">→</div>

                <div className="thumb-item">
                    <span className="thumb-label">T เป้าหมาย</span>
                    <div className="thumb-image">
                        {targetPreview && <img src={targetPreview} alt="Target" />}
                    </div>
                </div>
            </div>

            <div className="result-actions">
                <button className="btn btn-secondary" onClick={onReset}>
                    ← Previous
                </button>
                <button className="btn btn-primary" onClick={onProceedToEdit}>
                    🎨 Color Edit
                </button>
                <button className="btn btn-secondary" onClick={handleDownload}>
                    ⬇ Download
                </button>
            </div>
        </div>
    );
}

export default ResultDisplay;
