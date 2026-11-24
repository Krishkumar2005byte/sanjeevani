/**
 * App.jsx - Main Application Routing & Layout
 * Owner: Shared Architecture (All Devs)
 * 
 * Simple explanation:
 * Sets up the browser routes connecting the Navbar, Login (Role Selection), Home,
 * Patient voiceboard, Caregiver live dashboard, Doctor portal, and Medicines tracker.
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Patient from './pages/Patient.jsx';
import Doctors from './pages/Doctors.jsx';
import Caregiver from './pages/Caregiver.jsx';
import Medicines from './pages/Medicines.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/patient" element={<Patient />} />
            <Route path="/caregiver" element={<Caregiver />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/medicines" element={<Medicines />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
