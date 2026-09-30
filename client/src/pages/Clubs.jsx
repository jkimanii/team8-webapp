import { useState, useEffect } from 'react';
import ClubCard from '../components/ClubCard';
import './Clubs.css';

const API = 'http://localhost:5000/api/clubs';
const PAGE_SIZE = 12;

function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // CampusHub has no "list categories" endpoint, so derive the filter options
  // from one full-size fetch. Their max limit is 100.
  useEffect(() => {
    fetch(`${API}?limit=100`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => {
        const unique = [...new Set(body.data.map((c) => c.category))].sort();
        setCategories(unique);
      })
      .catch(() => setCategories([]));
  }, []);

  // CampusHub searches and paginates server-side, so refetch whenever the
  // query changes rather than filtering in the browser.
  useEffect(() => {
    const params = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (search) params.append('search', search);
    if (activeCategory !== 'all') params.append('category', activeCategory);

    setLoading(true);
    setError(null);

    fetch(`${API}?${params}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            (body && body.message) || `Request failed (${res.status})`
          );
        }
        return body;
      })
      .then((body) => {
        setClubs(body.data);
        setTotal(body.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [search, activeCategory, page]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function chooseCategory(cat) {
    setPage(1);
    setActiveCategory(cat);
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="clubs-page">
      <div className="clubs-header">
        <div>
          <h1>Campus Clubs</h1>
          <p className="clubs-subtitle">
            Clubs and societies from CampusHub, across Strathmore and partner
            campuses.
          </p>
        </div>
        {!loading && !error && (
          <p className="clubs-count">
            {total} club{total !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      <form className="clubs-search" onSubmit={handleSearch}>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search clubs by name, description or tag..."
          className="clubs-search-input"
          aria-label="Search clubs"
        />
        <button type="submit" className="clubs-search-btn">
          Search
        </button>
      </form>

      <div
        className="category-filters"
        role="group"
        aria-label="Filter by category"
      >
        <button
          className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => chooseCategory('all')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => chooseCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <p className="clubs-status">Loading clubs...</p>}

      {error && (
        <div className="clubs-error">
          <p>
            <strong>Couldn't load clubs.</strong> {error}
          </p>
          <p className="clubs-error-hint">
            CampusHub is a separate service run by Team 7. If their server is
            offline, this page stays empty while the rest of StrathShop keeps
            working.
          </p>
        </div>
      )}

      {!loading && !error && clubs.length === 0 && (
        <div className="empty-state">
          <span style={{ fontSize: '2.5rem' }}>🔍</span>
          <p>
            {search
              ? <>No clubs match <strong>"{search}"</strong></>
              : 'No clubs in this category yet.'}
          </p>
        </div>
      )}

      {!loading && !error && clubs.length > 0 && (
        <div className="clubs-grid">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} />
          ))}
        </div>
      )}

      {!loading && !error && lastPage > 1 && (
        <nav className="clubs-pagination" aria-label="Pagination">
          <button
            className="page-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            ← Previous
          </button>
          <span className="page-status">
            Page {page} of {lastPage}
          </span>
          <button
            className="page-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= lastPage}
          >
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}

export default Clubs;
