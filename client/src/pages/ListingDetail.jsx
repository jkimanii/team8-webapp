import { useParams, Link } from 'react-router-dom';
import './ListingDetail.css';

function ListingDetail({ listings = [] }) {
  const { id } = useParams();

  const listing = listings.find((item) => String(item.id) === id);

  if (!listing) {
    return (
      <div className="not-found">
        <h2>Listing not found</h2>
        <p>This item may have been removed or the link is incorrect.</p>
        <Link to="/">← Back to Browse</Link>
      </div>
    );
  }

  const {
    title,
    price,
    condition,
    category,
    sellerName,
    sellerCampus,
    imageUrl,
    description,
    datePosted,
  } = listing;

  return (
    <article className="detail-page">
      <Link to="/" className="back-link">
        ← Back to listings
      </Link>
      <div className="detail-layout">
        <div className="detail-image-col">
          <img src={imageUrl} alt={title} className="detail-image"></img>
        </div>

        <div className="detail-info-col">
          <span className="detail-category">{category}</span>
          <h1 className="detail-title">{title}</h1>
          <p className="detail-price">KES {price.toLocaleString()}</p>

          <div className="detail-badges">
            <span
              className={`condition-badge condition-${condition.toLowerCase().replace(' ', '-')}`}
            >
              {condition}
            </span>
          </div>

          <p className="detail-description">{description}</p>

          <div className="detail-seller">
            <p>
              <strong>Seller:</strong> {sellerName}
            </p>
            <p>
              <strong>Campus:</strong> {sellerCampus}
            </p>
            <p>
              <strong>Posted:</strong>{' '}
              {new Date(datePosted).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Message seller - future feature */}
          <button
            className="btn-message"
            disabled
            title="Messaging will be available in a future update"
          >
            Message Seller (Coming Soon)
          </button>
        </div>
      </div>
    </article>
  );
}

export default ListingDetail;
