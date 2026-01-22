import './GenerationProgress.css';

// Progress stages for visual clarity
const STAGES = [
    { id: 'compress', label: 'บีบอัดรูป', icon: '📦' },
    { id: 'upload', label: 'อัพโหลด', icon: '⬆️' },
    { id: 'process', label: 'AI ประมวลผล', icon: '🤖' },
    { id: 'finalize', label: 'เสร็จสิ้น', icon: '✨' }
];

function GenerationProgress({ isGenerating, progress, status, stage = 'process' }) {
    if (!isGenerating) return null;

    // Determine current stage index
    const currentStageIndex = STAGES.findIndex(s => s.id === stage);

    return (
        <div className="generation-progress">
            <div className="progress-content">
                {/* Stage Indicators */}
                <div className="progress-stages">
                    {STAGES.map((s, index) => (
                        <div
                            key={s.id}
                            className={`stage ${index < currentStageIndex ? 'completed' : ''} ${index === currentStageIndex ? 'active' : ''}`}
                        >
                            <div className="stage-icon">
                                {index < currentStageIndex ? '✓' : s.icon}
                            </div>
                            <span className="stage-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                <div className="progress-animation">
                    <div className="ai-icon">
                        <span className="icon-pulse">🤖</span>
                    </div>
                    <div className="progress-dots">
                        <span className="dot"></span>
                        <span className="dot"></span>
                        <span className="dot"></span>
                    </div>
                </div>

                <div className="progress-info">
                    <h3 className="progress-title">AI กำลังประมวลผล</h3>
                    <p className="progress-status">{status || 'กำลังสลับหน้า...'}</p>
                </div>

                <div className="progress-bar-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${progress || 0}%` }}
                    ></div>
                    <span className="progress-percent">{Math.round(progress || 0)}%</span>
                </div>

                <div className="progress-tips">
                    <span className="tip-icon">💡</span>
                    <span className="tip-text">
                        การประมวลผลอาจใช้เวลาสักครู่ กรุณารอสักครู่...
                    </span>
                </div>
            </div>
        </div>
    );
}

export default GenerationProgress;
