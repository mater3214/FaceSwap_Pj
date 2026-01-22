import { Component } from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary">
                    <div className="error-content">
                        <div className="error-icon">⚠️</div>
                        <h1 className="error-title">เกิดข้อผิดพลาด</h1>
                        <p className="error-message">
                            ขออภัย เกิดข้อผิดพลาดบางอย่างขึ้น กรุณาลองใหม่อีกครั้ง
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="error-details">
                                <summary>รายละเอียด Error (Development)</summary>
                                <pre>{this.state.error.toString()}</pre>
                                {this.state.errorInfo && (
                                    <pre>{this.state.errorInfo.componentStack}</pre>
                                )}
                            </details>
                        )}

                        <div className="error-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={this.handleReset}
                            >
                                🔄 ลองอีกครั้ง
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={this.handleReload}
                            >
                                🔃 รีโหลดหน้า
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
