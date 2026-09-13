import { Link } from 'react-router-dom';
import './ListingCard.css';

function ListingCard({ listing }) {
  const { id, title, price, condition, sellerCampus, imageUrl, category } =
    listing;

  return (
    <article className="listing-card">
      <Link to={`/listing/${id}`} className="card-link">
        <div className="card-image-wrapper">
          <img src={imageUrl} alt={title} className="card-image" />
          <span className="card-category">{category}</span>
        </div>
        <div className="card-body">
          <h2 className="card-title">{title}</h2>
          <p className="card-price">KES {price.toLocaleString()}</p>
          <div className="card-meta">
            <span
              className={`condition-badge condition-${condition.toLowerCase().replace(' ', '-')}`}
            >
              {condition}
            </span>
            <span className="card-campus">{sellerCampus}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ListingCard;
