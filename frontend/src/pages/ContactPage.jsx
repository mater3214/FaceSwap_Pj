import './ContactPage.css';

function ContactPage() {
    return (
        <div className="contact-page">
            <div className="container">
                <div className="contact-header">
                    <span className="contact-badge">Get In Touch</span>
                    <h1>We're Here to Help<br />with Your Facial AI Needs</h1>
                </div>

                <div className="contact-card">
                    <div className="contact-icon">
                        📧
                    </div>
                    <h2>Email</h2>
                    <a href="mailto:contact@insightface.ai" className="contact-email">
                        contact@insightface.ai
                    </a>
                    <p className="contact-hint">
                        Please contact us using the company e-mail address.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ContactPage;
