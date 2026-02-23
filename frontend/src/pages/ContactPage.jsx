import { useState } from 'react';
import './ContactPage.css';

function ContactPage() {
    const [formData, setFormData] = useState({
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState(''); // 'sending', 'success', 'error'

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');

        try {
            // ส่งข้อมูลผ่าน Web3Forms API (ส่งอีเมลได้ฟรีจากหน้าเว็บโดยตรง ไม่ต้องผ่าน Backend ของเราเอง)
            const response = await fetch("https://api.web3forms.com/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    // TODO: ให้แอดมินนำ Access Key จาก web3forms.com มาใส่ที่นี่ (ฟรี ดึงเข้าเมล materking7661@gmail.com)
                    access_key: "YOUR_WEB3FORMS_ACCESS_KEY",
                    email: formData.email,     // อีเมลของผู้ส่ง (ผู้ใช้)
                    subject: formData.subject, // หัวข้อ
                    message: formData.message, // ข้อความ
                    replyto: formData.email    // ตั้งค่าเวลาแอดมินกด Reply จะส่งกลับไปหาผู้ใช้
                }),
            });

            const result = await response.json();
            if (result.success) {
                setStatus('success');
                setFormData({ email: '', subject: '', message: '' });
                setTimeout(() => setStatus(''), 5000);
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error("Error sending email:", error);
            setStatus('error');
            setTimeout(() => setStatus(''), 5000);
        }
    };

    return (
        <div className="contact-page">
            <div className="container">
                <div className="contact-header">
                    <span className="contact-badge">Get In Touch</span>
                    <h1>We're Here to Help<br />with Your Facial AI Needs</h1>
                </div>

                <div className="contact-card">
                    <h2>Send Us a Message</h2>
                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Your Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="subject">Subject</label>
                            <input
                                type="text"
                                id="subject"
                                name="subject"
                                placeholder="What is this regarding?"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea
                                id="message"
                                name="message"
                                placeholder="Type your message here..."
                                rows="6"
                                value={formData.message}
                                onChange={handleChange}
                                required
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className={`btn btn-submit ${status === 'success' ? 'btn-success' : 'btn-primary'}`}
                            disabled={status === 'sending'}
                        >
                            {status === 'sending' ? 'Sending...' : status === 'success' ? 'Message Sent!' : 'Send Email'}
                        </button>

                        {status === 'error' && (
                            <p className="contact-hint" style={{ color: '#ef4444', marginTop: '1rem' }}>
                                Failed to send message. Please ensure the Access Key is configured.
                            </p>
                        )}
                        {status === 'success' && (
                            <p className="contact-hint" style={{ color: '#4ade80', marginTop: '1rem' }}>
                                Thank you! Your message has been sent successfully.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ContactPage;
