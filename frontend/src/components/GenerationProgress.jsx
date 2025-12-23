import './GenerationProgress.css';

function GenerationProgress({ isGenerating, progress, status }) {
    if (!isGenerating) return null;

    return (
        <div className="generation-progress">
            <div className="progress-content">
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
