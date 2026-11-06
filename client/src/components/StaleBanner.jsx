import './StaleBanner.css';

// Shown when the server could not reach CampusHub and is showing the last good
// copy it saved. Without this, saved data would look live, which is a lie.
function StaleBanner({ asOf }) {
  if (!asOf) return null;
  const time = new Date(asOf).toLocaleTimeString('en-KE', {
    timeZone: 'Africa/Nairobi',
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <p className="stale-banner" role="status">
      Showing saved data from {time}. CampusHub is not responding.
    </p>
  );
}

export default StaleBanner;
