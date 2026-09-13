import { Link, NavLink, useNavigate } from 'react-router-dom';
import './navbar.css';
import logo from '../../assets/logo.png';
import { useState } from 'react';

function Navbar({ onSearch }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    onSearch(query);
    navigate('/'); // Always go to Browse when searching
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <img src={logo} aria-hidden="true" />
        <span>
          <span className="logo-strath">Strath</span>Shop
        </span>
      </Link>

      <form className="navbar-search" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Search listings..."
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Browse
        </NavLink>
        <NavLink
          to="/post"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Post Item
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) =>
            isActive ? 'nav-btn-login active' : 'nav-btn-login'
          }
        >
          Login
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
