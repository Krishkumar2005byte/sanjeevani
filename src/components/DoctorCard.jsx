/**
 * DoctorCard.jsx - Doctor Directory & Booking Card (Figma Design)
 * Owner: Dev 2 (Doctor Matching)
 * 
 * Styled after Figma prototype:
 * - Avatar with initial badge
 * - Specialty tag, language chips, and available time
 * - Dark teal-green Book button with confirmed state
 */

import React from 'react';

export default function DoctorCard({ doctor, isBooked, onBook, bookingLoading }) {
  const initial = doctor.initial || doctor.name.replace('Dr. ', '')[0] || 'D';

  return (
    <div className={`figma-doctor-card ${isBooked ? 'booked' : ''}`}>
      <div className="doc-card-top">
        <div className="doc-avatar-initial">{initial}</div>
        <div className="doc-info-block">
          <h4 className="doc-name">{doctor.name}</h4>
          <span className="doc-specialty-tag">{doctor.specialty}</span>
        </div>
      </div>

      <div className="doc-languages-row">
        {doctor.languages.map((lang) => (
          <span key={lang} className="doc-lang-pill">
            {lang}
          </span>
        ))}
      </div>

      <div className="doc-time-row">
        <span className="time-icon">🕒</span>
        <span className="time-text">Available: {doctor.availableTime}</span>
      </div>

      <div className="doc-card-action">
        {isBooked ? (
          <div className="doc-booked-confirmed">
            ✓ Confirmed
          </div>
        ) : (
          <button
            type="button"
            className="btn-doc-book"
            onClick={() => onBook(doctor)}
            disabled={bookingLoading}
          >
            {bookingLoading ? 'Booking...' : 'Book'}
          </button>
        )}
      </div>
    </div>
  );
}
