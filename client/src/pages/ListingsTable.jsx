import { useState, useEffect } from 'react';

function ListingsTable() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/listings')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        setListings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading listings...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Listings</h1>
      <p>{listings.length} row(s) returned from GET /api/listings</p>

      <table
        border="1"
        cellPadding="8"
        style={{ borderCollapse: 'collapse', marginTop: '1rem' }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Price (KES)</th>
            <th>Condition</th>
            <th>Category</th>
            <th>Seller</th>
            <th>Campus</th>
            <th>Date Posted</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id}>
              <td>{listing.id}</td>
              <td>{listing.title}</td>
              <td>{Number(listing.price).toLocaleString()}</td>
              <td>{listing.condition}</td>
              <td>{listing.category}</td>
              <td>{listing.sellerName}</td>
              <td>{listing.sellerCampus}</td>
              <td>
                {new Date(listing.datePosted).toLocaleDateString('en-KE')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ListingsTable;
