import { useState } from 'react';
import { Link } from 'react-router-dom';
import ListingCard from '../components/ListingCard';
import './Browse.css';

function Browse({
  listings = [],
  categories = [],
  searchQuery = '',
  loading,
  error,
}) {
  const [activeCategory, setActiveCategory] = useState('all');

  if (loading) return <p>Loading listings...</p>;
  if (error) return <p>Error: {error}</p>;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredListings = listings.filter((listing) => {
    const matchesCategory =
      activeCategory === 'all' ||
      listing.category.toLowerCase() === activeCategory.toLowerCase();

    const matchesQuery =
      !normalizedQuery || listing.title.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });

  return (
    <section>
      <div className="browse-header">
        <h1>Browse Listings</h1>
        <p>
          {filteredListings.length} item
          {filteredListings.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Category filter bar */}
      <div
        className="category-filters"
        role="group"
        aria-label="Filter by category"
      >
        <button
          className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`filter-btn ${activeCategory === cat.label ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.label)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Listings grid or empty state */}
      {filteredListings.length > 0 ? (
        <div className="listings-grid">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span style={{ fontSize: '2.5rem' }}>🔍</span>
          <p>
            No listings match <strong>"{searchQuery}"</strong>
          </p>
        </div>
      )}
    </section>
  );
}

export default Browse;
