import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Login from './components/LoginPage';
import ComfyUI from './components/ComfyUI';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // User is signed in
        setUser(currentUser);
      } else {
        // User is signed out
        setUser(null);
      }
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              user ? <Navigate to="/comfyui" /> : <Login />
            }
          />
          <Route
            path="/comfyui"
            element={
              user ? (
                <div>
                  <ComfyUI />
                </div>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={<Navigate to={user ? "/comfyui" : "/login"} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
