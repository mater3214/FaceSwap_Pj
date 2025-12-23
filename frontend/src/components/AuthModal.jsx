import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
    const { signIn, signUp, isConfigured } = useAuth();
    const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await signIn(email, password);
                onClose();
            } else {
                await signUp(email, password, username);
                setSuccess('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี');
            }
        } catch (err) {
            setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError('');
        setSuccess('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button className="modal-close" onClick={onClose}>×</button>

                {/* Header */}
                <div className="modal-header">
                    <div className="modal-logo">🎭</div>
                    <h2 className="modal-title">
                        {mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                    </h2>
                    <p className="modal-subtitle">
                        {mode === 'login'
                            ? 'เข้าสู่ระบบเพื่อใช้งาน FaceLab'
                            : 'สร้างบัญชีใหม่เพื่อเริ่มใช้งาน'}
                    </p>
                </div>

                {/* Not Configured Warning */}
                {!isConfigured && (
                    <div className="config-warning">
                        <span className="warning-icon">⚠️</span>
                        <div>
                            <strong>Supabase ยังไม่ได้ตั้งค่า</strong>
                            <p>กรุณาเพิ่ม VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Username (signup only) */}
                    {mode === 'signup' && (
                        <div className="form-group">
                            <label htmlFor="username">ชื่อผู้ใช้</label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="กรอกชื่อผู้ใช้"
                                disabled={!isConfigured || loading}
                            />
                        </div>
                    )}

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">อีเมล</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            required
                            disabled={!isConfigured || loading}
                        />
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password">รหัสผ่าน</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            disabled={!isConfigured || loading}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="form-error">
                            <span>❌</span> {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="form-success">
                            <span>✅</span> {success}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary submit-btn"
                        disabled={!isConfigured || loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-small"></span>
                                กำลังดำเนินการ...
                            </>
                        ) : (
                            mode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'
                        )}
                    </button>
                </form>

                {/* Switch Mode */}
                <div className="modal-footer">
                    {mode === 'login' ? (
                        <p>
                            ยังไม่มีบัญชี?
                            <button className="link-btn" onClick={switchMode}>สมัครสมาชิก</button>
                        </p>
                    ) : (
                        <p>
                            มีบัญชีอยู่แล้ว?
                            <button className="link-btn" onClick={switchMode}>เข้าสู่ระบบ</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthModal;
