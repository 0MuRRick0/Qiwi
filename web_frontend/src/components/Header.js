import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Header.module.css';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>Qiwi</Link>
      <nav>
        {user ? (
          <>
            <span className={styles.navItem}>Hello, {user.data.username}</span>
            <button className={styles.navButton} onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.navLink}>Login</Link>
            <Link to="/register" className={styles.navLink}>Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;