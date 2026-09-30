import './ClubCard.css';

// Build initials for clubs with no logo (logoUrl is nullable in the contract).
function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function ClubCard({ club }) {
  const {
    name,
    description,
    category,
    logoUrl,
    meetingTime,
    meetingLocation,
    tags,
  } = club;

  return (
    <article className="club-card">
      <div className="club-card-header">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="club-logo" />
        ) : (
          <div className="club-logo club-logo-fallback" aria-hidden="true">
            {initials(name)}
          </div>
        )}
        <div className="club-heading">
          <h2 className="club-name">{name}</h2>
          <span className="club-category">{category}</span>
        </div>
      </div>

      {/* description, meetingTime and meetingLocation are all nullable */}
      {description && <p className="club-description">{description}</p>}

      {(meetingTime || meetingLocation) && (
        <dl className="club-meeting">
          {meetingTime && (
            <div className="club-meeting-row">
              <dt>Meets</dt>
              <dd>{meetingTime}</dd>
            </div>
          )}
          {meetingLocation && (
            <div className="club-meeting-row">
              <dt>Where</dt>
              <dd>{meetingLocation}</dd>
            </div>
          )}
        </dl>
      )}

      {tags.length > 0 && (
        <ul className="club-tags">
          {tags.map((tag) => (
            <li key={tag} className="club-tag">
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default ClubCard;
