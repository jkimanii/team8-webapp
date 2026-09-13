import { Outlet } from 'react-router-dom';
import Navbar from './navbar';
import Footer from './footer';
import './Layout.css';

function Layout({ onSearch }) {
  return (
    <div className="app-shell">
      <Navbar onSearch={onSearch} />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
