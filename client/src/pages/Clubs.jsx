import { useState, useEffect } from 'react';
import ClubCard from '../components/ClubCard';
import { apiFetch } from '../api';
import './Clubs.css';

const CLUBS_PATH = '/clubs';
const EVENTS_PATH = '/clubs/events';
const PAGE_SIZE = 12;

function formatEATDate(isoString) {
  if (!isoString) return 'TBA';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Clubs() {
  const [activeTab, setActiveTab] = useState('clubs'); // 'clubs' | 'events'

  // Clubs state
  const [clubs, setClubs] = useState([]);
  const [allClubsMap, setAllClubsMap] = useState({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Events state
  const [events, setEvents] = useState([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPage, setEventsPage] = useState(1);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  // Fetch categories and club lookup map
  useEffect(() => {
    apiFetch(CLUBS_PATH)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => {
        // Handle both { data: [...] }, { clubs: [...] }, or raw [...] array
        const list =
          body.data || body.clubs || (Array.isArray(body) ? body : []);
        const unique = [
          ...new Set(list.map((c) => c.category).filter(Boolean)),
        ].sort();
        setCategories(unique);

        const map = {};
        list.forEach((c) => {
          map[c.id] = c;
        });
        setAllClubsMap(map);
      })
      .catch(() => setCategories([]));
  }, []);

  // Fetch and filter/paginate clubs locally or from proxy
  useEffect(() => {
    setLoading(true);
    setError(null);

    apiFetch(CLUBS_PATH)
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
        let list = body.data || body.clubs || (Array.isArray(body) ? body : []);

        // Client-side search & category filter matching to be robust against backend variations
        if (search) {
          const q = search.toLowerCase();
          list = list.filter(
            (c) =>
              c.name?.toLowerCase().includes(q) ||
              c.description?.toLowerCase().includes(q) ||
              c.tags?.some((t) => t.toLowerCase().includes(q))
          );
        }

        if (activeCategory !== 'all') {
          list = list.filter((c) => c.category === activeCategory);
        }

        setTotal(list.length);

        // Client-side pagination slice
        const start = (page - 1) * PAGE_SIZE;
        setClubs(list.slice(start, start + PAGE_SIZE));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [search, activeCategory, page]);

  // Fetch events
  useEffect(() => {
    setEventsLoading(true);
    setEventsError(null);

    apiFetch(EVENTS_PATH)
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
        let list =
          body.data || body.events || (Array.isArray(body) ? body : []);
        if (selectedClubId) {
          list = list.filter((ev) => ev.clubId === selectedClubId);
        }
        setEventsTotal(list.length);
        const start = (eventsPage - 1) * PAGE_SIZE;
        setEvents(list.slice(start, start + PAGE_SIZE));
        setEventsLoading(false);
      })
      .catch((err) => {
        setEventsError(err.message);
        setEventsLoading(false);
      });
  }, [selectedClubId, eventsPage]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function chooseCategory(cat) {
    setPage(1);
    setActiveCategory(cat);
  }

  function viewEventsForClub(clubId) {
    setSelectedClubId(clubId);
    setEventsPage(1);
    setActiveTab('events');
  }

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const eventsLastPage = Math.max(1, Math.ceil(eventsTotal / PAGE_SIZE));

  return (
    <section className="clubs-page">
      <div className="clubs-header">
        <div>
          <h1>Campus Clubs & Events</h1>
          <p className="clubs-subtitle">
            Clubs, societies, and upcoming events from CampusHub, across
            Strathmore and partner campuses.
          </p>
        </div>

        <div className="clubs-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'clubs'}
            className={`tab-btn ${activeTab === 'clubs' ? 'active' : ''}`}
            onClick={() => setActiveTab('clubs')}
          >
            Clubs ({total})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'events'}
            className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            Events ({eventsTotal})
          </button>
        </div>
      </div>

      {/* ================= CLUBS SECTION ================= */}
      {activeTab === 'clubs' && (
        <>
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

          {categories.length > 0 && (
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
          )}

          {loading && <p className="clubs-status">Loading clubs...</p>}

          {error && (
            <div className="clubs-error">
              <p>
                <strong>Couldn't load clubs.</strong> {error}
              </p>
            </div>
          )}

          {!loading && !error && clubs.length === 0 && (
            <div className="empty-state">
              <span style={{ fontSize: '2.5rem' }}>🔍</span>
              <p>
                {search ? (
                  <>
                    No clubs match <strong>"{search}"</strong>
                  </>
                ) : (
                  'No clubs found.'
                )}
              </p>
            </div>
          )}

          {!loading && !error && clubs.length > 0 && (
            <div className="clubs-grid">
              {clubs.map((club) => (
                <div key={club.id} className="club-card-wrapper">
                  <ClubCard club={club} />
                  <button
                    type="button"
                    className="view-club-events-btn"
                    onClick={() => viewEventsForClub(club.id)}
                  >
                    View Club Events →
                  </button>
                </div>
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
        </>
      )}

      {/* ================= EVENTS SECTION ================= */}
      {activeTab === 'events' && (
        <>
          <div className="events-toolbar">
            <div className="events-filters">
              <label className="event-filter-label">
                Club:
                <select
                  value={selectedClubId}
                  onChange={(e) => {
                    setSelectedClubId(e.target.value);
                    setEventsPage(1);
                  }}
                  className="event-filter-select"
                >
                  <option value="">All Clubs</option>
                  {Object.values(allClubsMap).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              {selectedClubId && (
                <button
                  type="button"
                  className="filter-btn"
                  onClick={() => {
                    setSelectedClubId('');
                    setEventsPage(1);
                  }}
                >
                  Clear Club Filter
                </button>
              )}
            </div>
          </div>

          {eventsLoading && <p className="clubs-status">Loading events...</p>}

          {eventsError && (
            <div className="clubs-error">
              <p>
                <strong>Couldn't load events.</strong> {eventsError}
              </p>
            </div>
          )}

          {!eventsLoading && !eventsError && events.length === 0 && (
            <div className="empty-state">
              <span style={{ fontSize: '2.5rem' }}>📅</span>
              <p>No events found.</p>
            </div>
          )}

          {!eventsLoading && !eventsError && events.length > 0 && (
            <div className="clubs-grid">
              {events.map((event) => {
                const hostClub = allClubsMap[event.clubId];
                return (
                  <article key={event.id} className="event-card">
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="event-card-image"
                      />
                    )}
                    <div className="event-card-body">
                      <div className="event-card-meta">
                        <span className="event-badge">{event.category}</span>
                        <span className="event-club-name">
                          {hostClub ? hostClub.name : event.clubId}
                        </span>
                      </div>

                      <h3 className="event-card-title">{event.title}</h3>

                      {event.description && (
                        <p className="event-card-description">
                          {event.description}
                        </p>
                      )}

                      <div className="event-card-details">
                        <p>
                          <strong>🕒 Starts:</strong>{' '}
                          {formatEATDate(event.startTime)}
                        </p>
                        {event.location && (
                          <p>
                            <strong>📍 Location:</strong> {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!eventsLoading && !eventsError && eventsLastPage > 1 && (
            <nav className="clubs-pagination" aria-label="Events Pagination">
              <button
                className="page-btn"
                onClick={() => setEventsPage((p) => p - 1)}
                disabled={eventsPage <= 1}
              >
                ← Previous
              </button>
              <span className="page-status">
                Page {eventsPage} of {eventsLastPage}
              </span>
              <button
                className="page-btn"
                onClick={() => setEventsPage((p) => p + 1)}
                disabled={eventsPage >= eventsLastPage}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

export default Clubs;
