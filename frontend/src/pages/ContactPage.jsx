import { useState } from 'react';
import './ContactPage.css';

function ContactPage() {
    const [formData, setFormData] = useState({
        subject: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const email = 'materking7661@gmail.com';
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(formData.message)}`;
        window.location.href = mailtoLink;
        setFormData({ subject: '', message: '' });
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
                        <button type="submit" className="btn btn-primary btn-submit">
                            Send Email
                        </button>
                    </form>
                    <p className="contact-hint" style={{ marginTop: '1.5rem' }}>
                        This will open your default email app to message materking7661@gmail.com
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ContactPage;
