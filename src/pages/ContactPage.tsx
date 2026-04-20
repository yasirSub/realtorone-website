import React, { useState } from 'react';
import '../styles/contact-page.css';

const ContactPage: React.FC = () => {
    const [formState, setFormState] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setSubmitted(true);
    };

    return (
        <div className="contact-page" data-theme="dark">
            <div className="contact-container">
                <header className="contact-header">
                    <a href="/" className="back-link">← Back to RealtorOne</a>
                    <h1>Connect with Us</h1>
                    <p className="contact-subtitle">Expert support for modern Dubai realtors.</p>
                </header>

                <div className="contact-content">
                    <div className="contact-info">
                        <div className="info-card">
                            <h3>General Inquiries</h3>
                            <p>For questions about the platform or membership levels.</p>
                            <a href="mailto:aanant@therealtorone.com" className="contact-link">aanant@therealtorone.com</a>
                        </div>

                        <div className="info-card">
                            <h3>Phone Support</h3>
                            <p>Direct line for immediate assistance.</p>
                            <a href="tel:8595137609" className="contact-link">8595 137 609</a>
                        </div>

                        <div className="info-card">
                            <h3>Office Address</h3>
                            <p>Visit us at our regional headquarters.</p>
                            <address style={{ fontStyle: 'normal', color: '#cbd5e1', lineHeight: '1.6' }}>
                                70 A Second Floor, Subhash Rd,<br />
                                Race Course, Dehradun,<br />
                                Uttarakhand, India
                            </address>
                        </div>
                    </div>

                    <div className="contact-form-container">
                        {!submitted ? (
                            <form className="contact-form" onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="John Doe" 
                                        required 
                                        value={formState.name}
                                        onChange={e => setFormState({...formState, name: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="john@example.com" 
                                        required 
                                        value={formState.email}
                                        onChange={e => setFormState({...formState, email: e.target.value})}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Message</label>
                                    <textarea 
                                        rows={4} 
                                        placeholder="How can we help you?" 
                                        required 
                                        value={formState.message}
                                        onChange={e => setFormState({...formState, message: e.target.value})}
                                    ></textarea>
                                </div>
                                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        ) : (
                            <div className="success-message">
                                <div className="success-icon">✓</div>
                                <h3>Message Sent!</h3>
                                <p>We've received your inquiry and will get back to you within 24 hours.</p>
                                <button onClick={() => setSubmitted(false)} className="reset-btn">Send another message</button>
                            </div>
                        )}
                    </div>
                </div>

                <footer className="contact-footer">
                    <p>© 2026 RealtorOne. All rights reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default ContactPage;
