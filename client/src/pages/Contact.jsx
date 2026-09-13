import { useState } from 'react';
import './Contact.css';

function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validate() {
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!form.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(form.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!form.subject) {
      newErrors.subject = 'Please select a subject.';
    }
    if (!form.message.trim()) {
      newErrors.message = 'Message is required.';
    } else if (form.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long.';
    }
    return newErrors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="contact-success">
        <span>✉️</span>
        <h2>Message Sent!</h2>
        <p>Thank you for reaching out. We've received your message and we'll get back to you within 24 hours.</p>
        <button
          onClick={() => {
            setForm({ name: '', email: '', subject: '', message: '' });
            setSubmitted(false);
          }}
          className="btn-back"
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <div className="contact-header">
        <h1>Contact Us</h1>
        <p>Have questions, feedback, or need to report a listing? We're here to help.</p>
      </div>

      <div className="contact-container">
        {/* Contact Form */}
        <section className="contact-form-section">
          <form onSubmit={handleSubmit} noValidate className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Jane Doe"
                className={errors.name ? 'input-error' : ''}
              />
              {errors.name && <span className="error-msg">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. jane.doe@strathmore.edu"
                className={errors.email ? 'input-error' : ''}
              />
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject / Topic *</label>
              <select
                id="subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                className={errors.subject ? 'input-error' : ''}
              >
                <option value="">Select a topic</option>
                <option value="General Inquiry">General Inquiry</option>
                <option value="Report a Listing">Report a Listing</option>
                <option value="Partnership/University Onboarding">Partnership/University Onboarding</option>
                <option value="Bug Report">Bug Report</option>
              </select>
              {errors.subject && <span className="error-msg">{errors.subject}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="Write your message here..."
                className={errors.message ? 'input-error' : ''}
              />
              {errors.message && <span className="error-msg">{errors.message}</span>}
            </div>

            <button type="submit" className="btn-submit">
              Send Message
            </button>
          </form>
        </section>

        {/* Sidebar Info */}
        <aside className="contact-sidebar">
          <div className="info-card">
            <h3>Student-Run Project</h3>
            <p>
              Strathmore Marketplace is a peer-to-peer platform designed and maintained by students, for students. We strive to provide a safe space for campus commerce.
            </p>
          </div>

          <div className="info-card">
            <h3>Support Email</h3>
            <p className="email-placeholder">
              support@strathshop.edu
            </p>
            <p className="response-time">
              We monitor this inbox daily and aim to respond to all inquiries within 24 hours.
            </p>
          </div>

          <div className="info-card">
            <h3>Safety Reminder</h3>
            <p>
              Always prioritize safety. Meet buyers/sellers in public campus locations during daylight hours, and never share sensitive financial details or make advance payments.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Contact;
