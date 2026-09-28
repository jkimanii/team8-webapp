import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import PostListing from './pages/PostListing';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import ListingsTable from './pages/ListingsTable';

function App() {
  const [listings, setListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);

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

  useEffect(() => {
    fetch('http://localhost:5000/api/categories')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load categories');
        return res.json();
      })
      .then(setCategories)
      .catch((err) => console.error(err));
  }, []);

  function addListing(newListing) {
    setListings((prev) => [newListing, ...prev]);
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout onSearch={setSearchQuery} />}>
          <Route
            path="/"
            element={
              <Browse
                listings={listings}
                categories={categories}
                searchQuery={searchQuery}
                loading={loading}
                error={error}
              />
            }
          />
          <Route
            path="/listing/:id"
            element={<ListingDetail listings={listings} />}
          />
          <Route
            path="/post"
            element={
              <PostListing onAddListing={addListing} categories={categories} />
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/table" element={<ListingsTable />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
