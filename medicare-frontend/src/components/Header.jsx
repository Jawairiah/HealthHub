import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Header() {
  const { user, logout } = useContext(AuthContext);
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/");
  };

  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="logo">MediCare</Link>
        <nav>
          {!user && (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
          {user && user.role === "doctor" && <Link to="/doctor">Dashboard</Link>}
          {user && user.role === "patient" && <Link to="/patient">My Appointments</Link>}
          {user && <button className="link-btn" onClick={handleLogout}>Logout</button>}
        </nav>
      </div>
    </header>
  );
}
