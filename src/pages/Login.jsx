/**
 * Login.jsx - Dedicated Role Selection & Login Page
 * Owner: Shared Architecture (All Devs)
 * 
 * Simple explanation:
 * Provides a dedicated full-page view of the Role Login Board where users
 * can select and authenticate as Patient, Caregiver, or Doctor.
 */

import React from 'react';
import RoleLoginBoard from '../components/RoleLoginBoard';

export default function Login() {
  return (
    <div className="page-container login-page-container">
      <RoleLoginBoard />
    </div>
  );
}
