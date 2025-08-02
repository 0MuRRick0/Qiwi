import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import MovieDetail from './pages/MovieDetail';
import Player from './pages/Player';
import AddMoviePage from './pages/AddMoviePage';
import UploadMovieFiles from './pages/UploadMovieFiles';
import AdminEditMovie from './pages/AdminEditMovie';

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Header />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            
            <Route path="/movies/:id" element={
              <ProtectedRoute>
                <MovieDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/player/:id" element={
              <ProtectedRoute>
                <Player />
              </ProtectedRoute>
            } />

            <Route path="/movies/add" element={
              <ProtectedRoute>
                <AddMoviePage />
              </ProtectedRoute>
            } />

            <Route path="/movies/:movieId/upload" element={
              <ProtectedRoute>
                <UploadMovieFiles />
              </ProtectedRoute>
            } />
            
            <Route path="/movies/:movieId/edit" element={
              <ProtectedRoute>
                <AdminEditMovie />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;