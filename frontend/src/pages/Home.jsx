import { useState, useCallback } from 'react';
import ImageUploader from '../components/ImageUploader';
import RegionSelector from '../components/RegionSelector';
import GenerationProgress from '../components/GenerationProgress';
import ResultDisplay from '../components/ResultDisplay';
import ColorEditor from '../components/ColorEditor';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../context/AuthContext';
import { runSimSwap } from '../services/api';
import './Home.css';

// App States
const STATES = {
    UPLOAD: 'upload',
    REGION: 'region',
    GENERATING: 'generating',
    RESULT: 'result',
    EDITING: 'editing'
};

function Home() {
    // Auth
    const { user, isAuthenticated, signOut } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('login');

    // App state
    const [currentState, setCurrentState] = useState(STATES.UPLOAD);

    // Image files
    const [sourceFile, setSourceFile] = useState(null);
    const [targetFile, setTargetFile] = useState(null);

    // Region
    const [selectedRegion, setSelectedRegion] = useState(null);

    // Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [resultUrl, setResultUrl] = useState(null);
    const [error, setError] = useState(null);

    // Auth handlers
    const openLoginModal = () => {
        setAuthModalMode('login');
        setShowAuthModal(true);
    };

    const openSignupModal = () => {
        setAuthModalMode('signup');
        setShowAuthModal(true);
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (err) {
            console.error('Sign out failed:', err);
        }
    };

    // Handlers
    const handleSourceChange = useCallback((file) => {
        setSourceFile(file);
        setError(null);
    }, []);

    const handleTargetChange = useCallback((file) => {
        setTargetFile(file);
        setError(null);
    }, []);

    const handleRegionChange = useCallback((region) => {
        setSelectedRegion(region);
    }, []);

    const canProceedToRegion = sourceFile && targetFile;
    const canGenerate = sourceFile && targetFile && selectedRegion;

    const handleProceedToRegion = () => {
        if (canProceedToRegion) {
            setCurrentState(STATES.REGION);
        }
    };

    const handleGenerate = async () => {
        if (!canGenerate) return;

        try {
            setCurrentState(STATES.GENERATING);
            setIsGenerating(true);
            setProgress(0);
            setStatus('กำลังเตรียมข้อมูล...');
            setError(null);

            // Simulate progress
            setProgress(10);
            setStatus('กำลังอัพโหลดรูปภาพ...');

            await new Promise(r => setTimeout(r, 500));
            setProgress(30);
            setStatus('กำลังวิเคราะห์ใบหน้า...');

            let resultImageUrl = null;

            try {
                // Try to call real API
                const result = await runSimSwap(sourceFile, targetFile, selectedRegion?.id);
                resultImageUrl = result.result_url;
            } catch (apiError) {
                // Backend not available - use mock mode
                console.warn('Backend not available, using mock mode:', apiError.message);
                setStatus('โหมดทดสอบ (Backend ไม่พร้อม)...');
                await new Promise(r => setTimeout(r, 800));

                // Use target file as mock result (in real scenario, this would be AI-generated)
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
        setTargetFile(null);
        setSelectedRegion(null);
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
                        {/* Logo */}
                        <div className="logo">
                            <span className="logo-icon">🎭</span>
                            <span className="logo-text">FaceLab</span>
                        </div>

                        {/* Navigation Menu */}
                        <nav className="nav-menu">
                            <button
                                className={`nav-item ${currentState === STATES.UPLOAD ? 'active' : ''}`}
                                onClick={handleReset}
                            >
                                🏠 HOME
                            </button>
                            <button
                                className="nav-item active"
                            >
                                🎭 Face Swap
                            </button>
                        </nav>

                        {/* Auth Buttons */}
                        <div className="auth-buttons">
                            {isAuthenticated ? (
                                <>
                                    <div className="user-info">
                                        <span className="user-avatar">👤</span>
                                        <span className="user-email">{user?.email?.split('@')[0]}</span>
                                    </div>
                                    <button
                                        className="btn btn-ghost auth-btn"
                                        onClick={handleSignOut}
                                    >
                                        Sign out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="btn btn-ghost auth-btn"
                                        onClick={openSignupModal}
                                    >
                                        Sign up
                                    </button>
                                    <button
                                        className="btn btn-primary auth-btn"
                                        onClick={openLoginModal}
                                    >
                                        Log in
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="progress-steps">
                <div className="container">
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
                            label="เลือกภูมิภาค"
                            active={currentState === STATES.REGION}
                            completed={[STATES.GENERATING, STATES.RESULT, STATES.EDITING].includes(currentState)}
                        />
                        <div className="step-line"></div>
                        <StepIndicator
                            number={3}
                            label="สร้างภาพ"
                            active={currentState === STATES.GENERATING}
                            completed={[STATES.RESULT, STATES.EDITING].includes(currentState)}
                        />
                        <div className="step-line"></div>
                        <StepIndicator
                            number={4}
                            label="ปรับแต่ง"
                            active={currentState === STATES.EDITING}
                            completed={false}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="main">
                <div className="container">
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
                                targetFile={targetFile}
                                onSourceChange={handleSourceChange}
                                onTargetChange={handleTargetChange}
                            />

                            <div className="section-actions">
                                <button
                                    className="btn btn-primary btn-lg"
                                    disabled={!canProceedToRegion}
                                    onClick={handleProceedToRegion}
                                >
                                    ถัดไป: เลือกภูมิภาค →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Region State */}
                    {currentState === STATES.REGION && (
                        <div className="content-section">
                            <RegionSelector
                                selectedRegion={selectedRegion}
                                onRegionChange={handleRegionChange}
                            />

                            <div className="section-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleBackToUpload}
                                >
                                    ← กลับ
                                </button>
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
                                targetFile={targetFile}
                                resultUrl={resultUrl}
                                onReset={handleReset}
                                onProceedToEdit={handleProceedToEdit}
                            />
                        </div>
                    )}

                    {/* Editing State */}
                    {currentState === STATES.EDITING && (
                        <div className="content-section">
                            <ColorEditor
                                resultUrl={resultUrl}
                                selectedRegion={selectedRegion}
                                onBack={handleBackFromEdit}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <p>© 2024 FaceLab - AI Image Generation for Advertising</p>
                </div>
            </footer>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode={authModalMode}
            />
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
