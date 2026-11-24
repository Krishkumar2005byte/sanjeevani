/**
 * DoctorCard.jsx - Editorial Doctor Directory Card
 * Owner: Dev 2 & Member 4 (UI)
 */

import React from 'react';
import Icon from './Icons';

export default function DoctorCard({ doctor, isBooked, onBook, bookingLoading }) {
  const initial = doctor.initial || doctor.name.replace('Dr. ', '')[0] || 'D';

  return (
    <div className="card doc-card">
      <div className="doc-card-head">
        <span className="badge">{initial}</span>
        <div>
          <h4>{doctor.name}</h4>
          <span>{doctor.specialty}</span>
        </div>
      </div>

      <div className="chips">
        {doctor.languages.map((lang) => (
          <span key={lang} className="chip tag-active">
            {lang}
          </span>
        ))}
      </div>

      <div className="doc-card-meta">
        <Icon name="clock" />
        <span>Available: {doctor.availableTime}</span>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
        {isBooked ? (
          <span className="taken on">
            <Icon name="check" />
            Confirmed
          </span>
        ) : (
          <button
            type="button"
            className="btn sm"
            style={{ width: '100%' }}
            onClick={() => onBook(doctor)}
            disabled={bookingLoading}
          >
            {bookingLoading ? 'Booking...' : 'Book Consultation'}
          </button>
        )}
      </div>
    </div>
  );
}
