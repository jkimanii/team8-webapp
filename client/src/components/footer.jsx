import { Link } from 'react-router-dom';
import './footer.css';
import logo from '../../assets/logo.png';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-brand">
          <img src={logo} alt="" aria-hidden="true" />
          <span>
            <span className="logo-strath">Strath</span>Shop
          </span>
        </p>
        <p className="footer-tagline">
          A student marketplace for Strathmore University and nearby campuses.
        </p>
        <nav className="footer-links">
          <Link to="/">Browse</Link>
          <Link to="/post">Sell</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <p className="footer-disclaimer">
          This platform is a student project and is not officially affiliated
          with Strathmore University.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
