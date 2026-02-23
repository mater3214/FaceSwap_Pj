import { useEffect, useState, useMemo } from 'react';
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
    // Handle single or multi source files
    const hasMultipleSources = isMultiMode && sourceFiles.length > 0;

    // Manage ObjectURLs with proper cleanup
    const [sourcePreview, setSourcePreview] = useState(null);
    const [targetPreview, setTargetPreview] = useState(null);
    const [multiPreviews, setMultiPreviews] = useState([]);

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
        const urls = sourceFiles.slice(0, 4).map(f => URL.createObjectURL(f));
        setMultiPreviews(urls);
        return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
    }, [sourceFiles]);

    const [fetchedResultUrl, setFetchedResultUrl] = useState(null);

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

        const a = document.createElement('a');
        a.href = fetchedResultUrl;
        a.download = `facelab_result_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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

            <div className="comparison-view">
                {/* Source */}
                <div className="comparison-item">
                    <div className="item-label">
                        <span className="label-icon">{hasMultipleSources ? 'S' : 'S'}</span>
                        {hasMultipleSources ? 'รูปอ้างอิง (Sources)' : 'รูปอ้างอิง (Source)'}
                    </div>
                    <div className={`item-image ${hasMultipleSources ? 'multi-source' : ''}`}>
                        {hasMultipleSources ? (
                            <div className="multi-source-grid">
                                {multiPreviews.map((previewUrl, index) => (
                                    <img
                                        key={index}
                                        src={previewUrl}
                                        alt={`Source ${index + 1}`}
                                        className="multi-source-img"
                                    />
                                ))}
                                {sourceFiles.length > 4 && (
                                    <div className="more-indicator">
                                        +{sourceFiles.length - 4}
                                    </div>
                                )}
                            </div>
                        ) : (
                            sourcePreview && <img src={sourcePreview} alt="Source" />
                        )}
                    </div>
                </div>

                {/* Plus Sign */}
                <div className="operator">+</div>

                {/* Target */}
                <div className="comparison-item">
                    <div className="item-label">
                        <span className="label-icon">T</span>
                        รูปเป้าหมาย (Target)
                    </div>
                    <div className="item-image">
                        {targetPreview && <img src={targetPreview} alt="Target" />}
                    </div>
                </div>

                {/* Equals Sign */}
                <div className="operator">=</div>

                {/* Result */}
                <div className="comparison-item result">
                    <div className="item-label">
                        <span className="label-icon">R</span>
                        ผลลัพธ์
                    </div>
                    <div className="item-image result-image">
                        {fetchedResultUrl && (
                            <img
                                src={fetchedResultUrl}
                                alt="Result"
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="result-actions">
                <button className="btn btn-secondary" onClick={onReset}>
                    <span></span> Previous
                </button>
                <button className="btn btn-primary" onClick={onProceedToEdit}>
                    <span></span> Color Edit
                </button>
                <button className="btn btn-secondary" onClick={handleDownload}>
                    <span></span> Download
                </button>
            </div>
        </div>
    );
}

export default ResultDisplay;
