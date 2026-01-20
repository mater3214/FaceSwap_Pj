import { useState, useCallback } from 'react';
import ToolsPanel from '../components/ToolsPanel';
import ImageUploader from '../components/ImageUploader';
import GenerationProgress from '../components/GenerationProgress';
import ResultDisplay from '../components/ResultDisplay';
import ColorEditor from '../components/ColorEditor';
import { runSimSwap, runSimSwapMulti, getResultImageUrl } from '../services/api';
import './Home.css';

// App States
const STATES = {
    UPLOAD: 'upload',
    GENERATING: 'generating',
    RESULT: 'result',
    EDITING: 'editing'
};

function Home() {
    // Tool selection
    const [selectedTool, setSelectedTool] = useState('simswap-single');

    // App state
    const [currentState, setCurrentState] = useState(STATES.UPLOAD);

    // Image files (single source or multiple for multi-swap)
    const [sourceFile, setSourceFile] = useState(null);
    const [sourceFiles, setSourceFiles] = useState([]); // For multi-face swap
    const [targetFile, setTargetFile] = useState(null);

    // Region - Removed
    // const [selectedRegion, setSelectedRegion] = useState(null);

    // Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [resultUrl, setResultUrl] = useState(null);
    const [error, setError] = useState(null);

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

    // Removed handleProceedToRegion

    const handleGenerate = async () => {
        if (!canGenerate) return;

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
            setStatus('กำลังวิเคราะห์ใบหน้า...');

            let resultImageUrl = null;

            try {
                let result;
                if (isMultiMode) {
                    // Multi face swap
                    result = await runSimSwapMulti(sourceFiles, targetFile);
                } else {
                    // Single face swap
                    result = await runSimSwap(sourceFile, targetFile, null); // Region ID is null
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
            setCurrentState(STATES.REGION);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setSourceFile(null);
        setSourceFiles([]);
        setTargetFile(null);
        // setSelectedRegion(null); //- Removed
        setResultUrl(null);
        setError(null);
        setProgress(0);
        setCurrentState(STATES.UPLOAD);
    };

    const handleProceedToEdit = () => {
        setCurrentState(STATES.EDITING);
    };

    const handleBackFromEdit = () => {
        setCurrentState(STATES.RESULT);
    };

    const handleBackToUpload = () => {
        setCurrentState(STATES.UPLOAD);
    };

    return (
        <div className="home">
            {/* Header */}
            <header className="header">
                <div className="container">
                    <div className="header-content">
                        <div className="logo">
                            <span className="logo-text">FaceLab</span>
                        </div>
                        <div className="header-tagline">
                            AI for face editing • modular services
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Layout with Tools Panel */}
            <div className="main-layout">
                {/* Tools Panel - Left Sidebar */}
                <aside className="sidebar">
                    <ToolsPanel
                        selectedTool={selectedTool}
                        onToolChange={handleToolChange}
                    />
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {/* Tool Title */}
                    <div className="tool-header">
                        <h2>
                            {selectedTool === 'simswap-single' && 'SimSwap (Single Face)'}
                            {selectedTool === 'simswap-multi' && 'SimSwap (Multi Face)'}
                            {selectedTool === 'difareli' && 'DiFaReLi (Relighting)'}
                        </h2>
                    </div>

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
                            {/* Region Step Removed */}
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
                                <button
                                    className="btn btn-primary btn-lg"
                                    disabled={!canGenerate}
                                    onClick={handleGenerate}
                                >
                                    🚀 เริ่มสร้างภาพ
                                </button>
                            </div>
                        </div>
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

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <p>© 2024 FaceLab - AI Image Generation for Advertising</p>
                </div>
            </footer>
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

export default Home;
