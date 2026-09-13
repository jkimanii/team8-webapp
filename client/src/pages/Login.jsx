import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function validate() {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.(edu|ac)(\.[a-z]{2,3})?$/i.test(form.email)) {
      errs.email = 'Please use your school email.';
    }
    if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitted(true); // Show a success state (mock)
  }

  if (submitted) {
    return (
      <div className="auth-success">
        <span>✅</span>
        <h2>You're in!</h2>
        <Link to="/">Back to Browse</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p>Log in with your school email.</p>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="username@school.edu"
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="error-msg">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              placeholder="Password"
              onChange={handleChange}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && (
              <span className="error-msg">{errors.password}</span>
            )}
          </div>
          <button type="submit" className="btn-submit">
            Log In
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
