import { useState, useEffect, useRef, useCallback } from 'react';
import {
    getHeadNeRFSamples,
    getHeadNeRFCurrent,
    setHeadNeRFSource,
    setHeadNeRFTarget,
    renderHeadNeRF,
    fitHeadNeRF
} from '../services/api';
import './HeadNeRFTool.css';

const BLEND_SLIDERS = [
    { id: 'identity', label: 'Identity', icon: '👤' },
    { id: 'expression', label: 'Expression', icon: '😊' },
    { id: 'albedo', label: 'Albedo', icon: '🎨' },
    { id: 'illumination', label: 'Light', icon: '💡' },
];

const VIEW_SLIDERS = [
    { id: 'pitch', label: 'Pitch', icon: '↕️', min: -1, max: 1 },
    { id: 'yaw', label: 'Yaw', icon: '↔️', min: -1, max: 1 },
    { id: 'roll', label: 'Roll', icon: '🔄', min: -1, max: 1 },
];

const DEBOUNCE_MS = 100;

function HeadNeRFTool() {
    const [samples, setSamples] = useState([]);
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [sourcePreview, setSourcePreview] = useState('');
    const [targetPreview, setTargetPreview] = useState('');

    const [sliderValues, setSliderValues] = useState({
        identity: 0, expression: 0, albedo: 0, illumination: 0,
        pitch: 0, yaw: 0, roll: 0
    });

    const [outputImage, setOutputImage] = useState('');
    const [isRendering, setIsRendering] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('blend');

    // Fitting state
    const [fitFile, setFitFile] = useState(null);
    const [fitPreview, setFitPreview] = useState('');
    const [isFitting, setIsFitting] = useState(false);
    const [fitResult, setFitResult] = useState(null);
    const [fitStatus, setFitStatus] = useState('');

    const renderTimeoutRef = useRef(null);
    const dragRef = useRef(null);

    useEffect(() => {
        initHeadNeRF();
    }, []);

    const initHeadNeRF = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const sampleList = await getHeadNeRFSamples();
            setSamples(sampleList);

            if (sampleList.length >= 2) {
                setSource(sampleList[0].name);
                setTarget(sampleList[1].name);
            }

            try {
                const current = await getHeadNeRFCurrent();
                if (current.source) setSource(current.source);
                if (current.target) setTarget(current.target);
            } catch {
                // Ignore
            }

            await doRender();
            setIsLoading(false);
        } catch (err) {
            setError('Failed to connect to HeadNeRF service. Make sure it\'s running on port 8003.');
            setIsLoading(false);
        }
    };

    const doRender = useCallback(async () => {
        try {
            setIsRendering(true);
            const result = await renderHeadNeRF(sliderValues);
            if (result.ok && result.image) {
                setOutputImage(`data:image/png;base64,${result.image}`);
            }
        } catch (err) {
            console.error('Render error:', err);
        } finally {
            setIsRendering(false);
        }
    }, [sliderValues]);

    const debouncedRender = useCallback(() => {
        if (renderTimeoutRef.current) {
            clearTimeout(renderTimeoutRef.current);
        }
        renderTimeoutRef.current = setTimeout(doRender, DEBOUNCE_MS);
    }, [doRender]);

    const handleSliderChange = (id, value) => {
        setSliderValues(prev => ({ ...prev, [id]: parseFloat(value) }));
        debouncedRender();
    };

    const handleSourceChange = async (e) => {
        const name = e.target.value;
        setSource(name);
        try {
            const result = await setHeadNeRFSource(name);
            if (result.preview_base64) {
                setSourcePreview(`data:image/png;base64,${result.preview_base64}`);
            }
            await doRender();
        } catch (err) {
            console.error('Source error:', err);
        }
    };

    const handleTargetChange = async (e) => {
        const name = e.target.value;
        setTarget(name);
        try {
            const result = await setHeadNeRFTarget(name);
            if (result.preview_base64) {
                setTargetPreview(`data:image/png;base64,${result.preview_base64}`);
            }
            await doRender();
        } catch (err) {
            console.error('Target error:', err);
        }
    };

    const handleReset = () => {
        setSliderValues({
            identity: 0, expression: 0, albedo: 0, illumination: 0,
            pitch: 0, yaw: 0, roll: 0
        });
        setTimeout(doRender, 50);
    };

    const handleFitFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFitFile(file);
            setFitPreview(URL.createObjectURL(file));
            setFitResult(null);
            setFitStatus('');
        }
    };

    const handleFitDrop = (e) => {
        e.preventDefault();
        dragRef.current?.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            setFitFile(file);
            setFitPreview(URL.createObjectURL(file));
            setFitResult(null);
            setFitStatus('');
        }
    };

    const handleFit = async () => {
        if (!fitFile) return;

        try {
            setIsFitting(true);
            setFitStatus('Processing image...');
            setFitResult(null);

            const result = await fitHeadNeRF(fitFile);

            if (result.ok) {
                setFitResult(result);
                setFitStatus('Complete! New sample added.');
                const newSamples = await getHeadNeRFSamples();
                setSamples(newSamples);
            } else {
                throw new Error(result.error || 'Fitting failed');
            }
        } catch (err) {
            setFitStatus(`Error: ${err.message}`);
        } finally {
            setIsFitting(false);
        }
    };

    if (error) {
        return (
            <div className="headnerf-page">
                <div className="headnerf-error">
                    <div className="error-icon">⚠️</div>
                    <h2>Service Unavailable</h2>
                    <p>{error}</p>
                    <button className="btn-primary" onClick={initHeadNeRF}>
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="headnerf-page">
            {/* Header */}
            <header className="headnerf-header">
                <h1>HeadNeRF</h1>
                <p>Neural Radiance Field for Parametric Head Generation</p>
            </header>

            {/* Tab Navigation */}
            <div className="tab-bar">
                <button
                    className={`tab-item ${activeTab === 'blend' ? 'active' : ''}`}
                    onClick={() => setActiveTab('blend')}
                >
                    ⚙️ Blending
                </button>
                <button
                    className={`tab-item ${activeTab === 'fit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('fit')}
                >
                    📷 Fitting
                </button>
            </div>

            {/* Main Content */}
            {activeTab === 'blend' ? (
                <div className="blend-layout">
                    {/* Output - Left Side */}
                    <div className="output-section">
                        <div className="output-frame">
                            {isLoading ? (
                                <div className="output-loading">
                                    <span className="spinner large"></span>
                                    <p>Loading HeadNeRF...</p>
                                </div>
                            ) : outputImage ? (
                                <img src={outputImage} alt="Rendered" />
                            ) : (
                                <div className="output-placeholder">
                                    <span>🖼️</span>
                                    <p>Output</p>
                                </div>
                            )}
                            {isRendering && <div className="render-indicator">Rendering...</div>}
                        </div>
                    </div>

                    {/* Controls - Right Side */}
                    <div className="controls-section">
                        {/* Identity Selection - Compact */}
                        <div className="identity-row">
                            <div className="identity-item">
                                <div className="identity-avatar">
                                    {sourcePreview ? (
                                        <img src={sourcePreview} alt="Source" />
                                    ) : (
                                        <span>A</span>
                                    )}
                                </div>
                                <select value={source} onChange={handleSourceChange}>
                                    {samples.map(s => (
                                        <option key={s.name} value={s.name}>
                                            {s.name.replace('.pth', '')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="blend-indicator">
                                <span>→ Blend →</span>
                            </div>
                            <div className="identity-item">
                                <div className="identity-avatar">
                                    {targetPreview ? (
                                        <img src={targetPreview} alt="Target" />
                                    ) : (
                                        <span>B</span>
                                    )}
                                </div>
                                <select value={target} onChange={handleTargetChange}>
                                    {samples.map(s => (
                                        <option key={s.name} value={s.name}>
                                            {s.name.replace('.pth', '')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Blend Controls - Horizontal Layout */}
                        <div className="sliders-panel">
                            <div className="slider-group-header">
                                <span>Blend Controls</span>
                                <span className="hint">0 = Source, 1 = Target</span>
                            </div>
                            <div className="sliders-grid">
                                {BLEND_SLIDERS.map(s => (
                                    <div key={s.id} className="slider-compact">
                                        <div className="slider-top">
                                            <span>{s.icon} {s.label}</span>
                                            <span className="slider-val">{sliderValues[s.id].toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={sliderValues[s.id]}
                                            onChange={(e) => handleSliderChange(s.id, e.target.value)}
                                            className="slider blend"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* View Controls */}
                        <div className="sliders-panel">
                            <div className="slider-group-header">
                                <span>View Controls</span>
                            </div>
                            <div className="sliders-row">
                                {VIEW_SLIDERS.map(s => (
                                    <div key={s.id} className="slider-compact">
                                        <div className="slider-top">
                                            <span>{s.icon} {s.label}</span>
                                            <span className="slider-val">{sliderValues[s.id].toFixed(2)}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={s.min}
                                            max={s.max}
                                            step={0.01}
                                            value={sliderValues[s.id]}
                                            onChange={(e) => handleSliderChange(s.id, e.target.value)}
                                            className="slider view"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reset */}
                        <button className="reset-btn" onClick={handleReset}>
                            ↺ Reset All
                        </button>
                    </div>
                </div>
            ) : (
                /* Fitting Tab */
                <div className="fit-layout">
                    <div className="fit-container">
                        <h3>Create New Identity</h3>
                        <p>Upload a face photo to convert it into a HeadNeRF latent code.</p>

                        <div className="fit-grid">
                            {/* Upload */}
                            <div
                                className={`fit-drop ${fitPreview ? 'has-image' : ''}`}
                                ref={dragRef}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    dragRef.current?.classList.add('drag-over');
                                }}
                                onDragLeave={() => dragRef.current?.classList.remove('drag-over')}
                                onDrop={handleFitDrop}
                                onClick={() => document.getElementById('fit-input').click()}
                            >
                                {fitPreview ? (
                                    <img src={fitPreview} alt="Upload" />
                                ) : (
                                    <>
                                        <span className="fit-icon">📷</span>
                                        <span>Drop image here</span>
                                    </>
                                )}
                                <input
                                    id="fit-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFitFileChange}
                                    hidden
                                />
                            </div>

                            {/* Result */}
                            <div className="fit-result-box">
                                {fitResult?.result_image ? (
                                    <>
                                        <img
                                            src={`data:image/png;base64,${fitResult.result_image}`}
                                            alt="Result"
                                        />
                                        <span className="result-name">{fitResult.fitted_name}</span>
                                    </>
                                ) : (
                                    <span className="fit-placeholder">Result will appear here</span>
                                )}
                            </div>
                        </div>

                        <button
                            className="fit-btn"
                            onClick={handleFit}
                            disabled={isFitting || !fitFile}
                        >
                            {isFitting ? (
                                <>
                                    <span className="spinner"></span>
                                    Processing...
                                </>
                            ) : (
                                <>🚀 Start Fitting</>
                            )}
                        </button>

                        {fitStatus && (
                            <div className={`fit-status ${fitResult ? 'success' : isFitting ? 'loading' : 'error'}`}>
                                {fitStatus}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default HeadNeRFTool;
