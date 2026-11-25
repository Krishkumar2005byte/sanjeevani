/**
 * App.jsx - Main Application Routing, Part E Mode/Role Entry Flow & Route Guards
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import { GlassFilter } from '@/components/ui/liquid-glass-button';
import { ModeProvider } from '@/components/modes/ModeProvider';
import { ModePickerScreen } from '@/components/modes/ModePickerScreen';
import { RolePickerScreen } from '@/components/modes/RolePickerScreen';
import { RoleRouteGuard } from '@/components/modes/RoleRouteGuard';
import { HomePatientDashboard } from '@/components/roles/HomePatientDashboard';
import { HomeCaretakerDashboard } from '@/components/roles/HomeCaretakerDashboard';
import { HospitalPatientDashboard } from '@/components/roles/HospitalPatientDashboard';
import { HospitalDoctorDashboard } from '@/components/roles/HospitalDoctorDashboard';
import { HospitalNurseDashboard } from '@/components/roles/HospitalNurseDashboard';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Patient from './pages/Patient.jsx';
import Doctors from './pages/Doctors.jsx';
import Caregiver from './pages/Caregiver.jsx';
import Medicines from './pages/Medicines.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ModeProvider>
        <div className="app-layout min-h-dvh w-full overflow-x-clip">
          <GlassFilter />
          <Navbar />
          <main className="app-main">
            <Routes>
              {/* Part E Entry Flow: Full-Screen Mode Picker -> Role Picker */}
              <Route path="/" element={<ModePickerScreen />} />
              <Route path="/select-role" element={<RolePickerScreen />} />

              {/* Protected Part E Mode & Role Dashboards */}
              <Route
                path="/home/patient"
                element={
                  <RoleRouteGuard>
                    <HomePatientDashboard />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/home/caretaker"
                element={
                  <RoleRouteGuard>
                    <HomeCaretakerDashboard />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/hospital/patient"
                element={
                  <RoleRouteGuard>
                    <HospitalPatientDashboard />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/hospital/doctor"
                element={
                  <RoleRouteGuard>
                    <HospitalDoctorDashboard />
                  </RoleRouteGuard>
                }
              />
              <Route
                path="/hospital/nurse"
                element={
                  <RoleRouteGuard>
                    <HospitalNurseDashboard />
                  </RoleRouteGuard>
                }
              />

              {/* Existing Sanjeevani Routes Preserved Intact */}
              <Route path="/portal" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/patient" element={<Patient />} />
              <Route path="/caregiver" element={<Caregiver />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/medicines" element={<Medicines />} />
            </Routes>
          </main>
        </div>
      </ModeProvider>
    </BrowserRouter>
  );
}
