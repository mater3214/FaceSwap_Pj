import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ImageUploader from '../components/ImageUploader';
import GenerationProgress from '../components/GenerationProgress';
import ResultDisplay from '../components/ResultDisplay';
import ColorEditor from '../components/ColorEditor';
import FaceMapper from '../components/FaceMapper';
import { runSimSwap, runSimSwapMultiWithMapping, getResultImageUrl } from '../services/api';
import './FaceSwapTool.css';
import './HeadNeRFTool.css';

// App States
const STATES = {
    UPLOAD: 'upload',
    MAPPING: 'mapping',  // New state for face mapping in multi mode
    GENERATING: 'generating',
    RESULT: 'result',
    EDITING: 'editing'
};

function FaceSwapTool() {
    const location = useLocation();

    // Determine tool from URL
    const getToolFromPath = () => {
        if (location.pathname.includes('simswap-multi')) return 'simswap-multi';
        if (location.pathname.includes('simswap')) return 'simswap-single';
        return 'simswap-single';
    };

    // Tool selection
    const [selectedTool, setSelectedTool] = useState(getToolFromPath);

    // Update tool when route changes
    useEffect(() => {
        setSelectedTool(getToolFromPath());
    }, [location.pathname]);

    // App state
    const [currentState, setCurrentState] = useState(STATES.UPLOAD);

    // Image files (single source or multiple for multi-swap)
    const [sourceFile, setSourceFile] = useState(null);
    const [sourceFiles, setSourceFiles] = useState([]); // For multi-face swap
    const [targetFile, setTargetFile] = useState(null);

    // Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [resultUrl, setResultUrl] = useState(null);
    const [error, setError] = useState(null);
    const [faceMapping, setFaceMapping] = useState(null);  // Face mapping for multi mode

    // Handlers
    const handleToolChange = (toolId) => {
        setSelectedTool(toolId);
        // Reset files when switching tools
        setSourceFile(null);
        setSourceFiles([]);
        setTargetFile(null);
        setCurrentState(STATES.UPLOAD);
    };

    const handleSourceChange = useCallback((file) => {
        setSourceFile(file);
        setError(null);
    }, []);

    const handleSourceFilesChange = useCallback((files) => {
        setSourceFiles(files);
        setError(null);
    }, []);

    const handleTargetChange = useCallback((file) => {
        setTargetFile(file);
        setError(null);
    }, []);

    const isMultiMode = selectedTool === 'simswap-multi';
    const canGenerate = isMultiMode
        ? (sourceFiles.length > 0 && targetFile)
        : (sourceFile && targetFile);

    // For multi mode: go to mapping step first
    const handleProceedToMapping = () => {
        if (sourceFiles.length > 0 && targetFile) {
            setCurrentState(STATES.MAPPING);
        }
    };

    // Called after face mapping is complete
    const handleMappingComplete = async (mapping) => {
        setFaceMapping(mapping);
        await handleGenerateWithMapping(mapping);
    };

    // Back from mapping to upload
    const handleBackFromMapping = () => {
        setCurrentState(STATES.UPLOAD);
    };

    // Generate with optional mapping
    const handleGenerateWithMapping = async (mapping = null) => {
        try {
            setCurrentState(STATES.GENERATING);
            setIsGenerating(true);
            setProgress(0);
            setStatus('กำลังเตรียมข้อมูล...');
            setError(null);

            setProgress(10);
            setStatus('กำลังอัพโหลดรูปภาพ...');

            await new Promise(r => setTimeout(r, 500));
            setProgress(30);
            setStatus('กำลังสลับใบหน้า...');

            let resultImageUrl = null;

            try {
                let result;
                if (isMultiMode) {
                    // Multi face swap with mapping
                    result = await runSimSwapMultiWithMapping(sourceFiles, targetFile, mapping);
                } else {
                    // Single face swap
                    result = await runSimSwap(sourceFile, targetFile, null);
                }
                resultImageUrl = getResultImageUrl(result.result_url);
            } catch (apiError) {
                console.warn('Backend not available, using mock mode:', apiError.message);
                setStatus('โหมดทดสอบ (Backend ไม่พร้อม)...');
                await new Promise(r => setTimeout(r, 800));
                resultImageUrl = URL.createObjectURL(targetFile);
            }

            setProgress(90);
            setStatus('กำลังสร้างผลลัพธ์...');

            await new Promise(r => setTimeout(r, 300));
            setProgress(100);

            setResultUrl(resultImageUrl);
            setCurrentState(STATES.RESULT);
        } catch (err) {
            console.error('Generation failed:', err);
            setError(err.message || 'เกิดข้อผิดพลาดในการสร้างภาพ');
            setCurrentState(STATES.UPLOAD);
        } finally {
            setIsGenerating(false);
        }
    };

    // For single mode - generate directly
    const handleGenerate = async () => {
        if (!canGenerate) return;
        await handleGenerateWithMapping(null);
    };

    const handleReset = () => {
        setSourceFile(null);
        setSourceFiles([]);
        setTargetFile(null);
        setResultUrl(null);
        setError(null);
        setProgress(0);
        setFaceMapping(null);
        setCurrentState(STATES.UPLOAD);
    };

    const handleProceedToEdit = () => {
        setCurrentState(STATES.EDITING);
    };

    const handleBackFromEdit = () => {
        setCurrentState(STATES.RESULT);
    };

    return (
        <div className="tool-page">
            <div className="background-decor"></div>

            {/* Main Content */}
            <main className="main-content tool-content-area">
                {/* Simple Header */}
                <header className="headnerf-header">
                    <h1>SimSwap</h1>
                    <p>High-fidelity face swapping for single portraits or group photos</p>
                </header>

                {/* Progress Steps */}
                <div className="progress-steps">
                    <div className="steps">
                        <StepIndicator
                            number={1}
                            label="อัพโหลด"
                            active={currentState === STATES.UPLOAD}
                            completed={currentState !== STATES.UPLOAD}
                        />
                        <div className="step-line"></div>
                        <StepIndicator
                            number={2}
                            label="สร้างภาพ"
                            active={currentState === STATES.GENERATING}
                            completed={[STATES.RESULT, STATES.EDITING].includes(currentState)}
                        />
                        <div className="step-line"></div>
                        <StepIndicator
                            number={3}
                            label="ปรับแต่ง"
                            active={currentState === STATES.EDITING}
                            completed={false}
                        />
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="error-banner">
                        <span className="error-icon">⚠️</span>
                        <span>{error}</span>
                        <button className="close-btn" onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {/* Upload State */}
                {currentState === STATES.UPLOAD && (
                    <div className="content-section">
                        <ImageUploader
                            sourceFile={sourceFile}
                            sourceFiles={sourceFiles}
                            targetFile={targetFile}
                            onSourceChange={handleSourceChange}
                            onSourceFilesChange={handleSourceFilesChange}
                            onTargetChange={handleTargetChange}
                            isMultiMode={isMultiMode}
                        />

                        <div className="section-actions">
                            {isMultiMode ? (
                                <button
                                    className="btn btn-primary btn-lg"
                                    disabled={!canGenerate}
                                    onClick={handleProceedToMapping}
                                >
                                    🎯 ตั้งค่า Face Mapping
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary btn-lg"
                                    disabled={!canGenerate}
                                    onClick={handleGenerate}
                                >
                                    🚀 เริ่มสร้างภาพ
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Face Mapping State (Multi mode only) */}
                {currentState === STATES.MAPPING && isMultiMode && (
                    <FaceMapper
                        sourceFiles={sourceFiles}
                        targetFile={targetFile}
                        onMappingComplete={handleMappingComplete}
                        onBack={handleBackFromMapping}
                    />
                )}

                {/* Generating State */}
                {currentState === STATES.GENERATING && (
                    <GenerationProgress
                        isGenerating={isGenerating}
                        progress={progress}
                        status={status}
                    />
                )}

                {/* Result State */}
                {currentState === STATES.RESULT && (
                    <div className="content-section">
                        <ResultDisplay
                            sourceFile={sourceFile}
                            sourceFiles={sourceFiles}
                            targetFile={targetFile}
                            resultUrl={resultUrl}
                            onReset={handleReset}
                            onProceedToEdit={handleProceedToEdit}
                            isMultiMode={isMultiMode}
                        />
                    </div>
                )}

                {/* Editing State */}
                {currentState === STATES.EDITING && (
                    <div className="content-section">
                        <ColorEditor
                            resultUrl={resultUrl}
                            selectedRegion={null}
                            onBack={handleBackFromEdit}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

// Step Indicator Component
function StepIndicator({ number, label, active, completed }) {
    return (
        <div className={`step ${active ? 'active' : ''} ${completed ? 'completed' : ''}`}>
            <div className="step-number">
                {completed ? '✓' : number}
            </div>
            <span className="step-label">{label}</span>
        </div>
    );
}

export default FaceSwapTool;
