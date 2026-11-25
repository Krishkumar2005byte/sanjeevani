/**
 * EmergencyPanel.tsx - Modular Emergency Contacts & One-Tap Call Panel
 * - Native tel: links work offline even if AI / Camera / Network fail
 * - Priority sorted + "Call All / Alert All Family" broadcast action
 * - Strictly honors lib/permissions.ts: editable by Caretaker (Home) / Nurse (Hospital), READ-ONLY for Patient
 */

import React, { useState } from 'react';
import {
  PhoneCall,
  Ambulance,
  ShieldAlert,
  UserPlus,
  Trash2,
  Edit3,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import {
  deleteEmergencyContact,
  getContactsForMode,
  triggerSosAlert,
  upsertEmergencyContact,
} from '../../lib/data/sanjeevaniStore';
import { canEditEmergencyContacts } from '../../lib/permissions';
import { speak } from '../../lib/speech.js';
import type { AppMode, AppRole, EmergencyContact, EmergencyContactCategory } from '../../lib/data/types';

export interface EmergencyPanelProps {
  mode: AppMode;
  role: AppRole;
  contacts: EmergencyContact[];
  onTriggerSos?: () => void;
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({
  mode,
  role,
  contacts,
  onTriggerSos,
}) => {
  const canEdit = canEditEmergencyContacts(mode, role);
  const visibleContacts = getContactsForMode(contacts, mode);
  const customContacts = visibleContacts.filter((c) => c.category === 'family' || c.category === 'doctor' || c.category === 'nurse_station');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [relationOrRole, setRelationOrRole] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<EmergencyContactCategory>('family');
  const [priority, setPriority] = useState(5);
  const [showForm, setShowForm] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);

  const startAdd = () => {
    setEditingId(null);
    setName('');
    setRelationOrRole('');
    setPhone('');
    setCategory('family');
    setPriority(visibleContacts.length + 1);
    setShowForm(true);
  };

  const startEdit = (c: EmergencyContact) => {
    setEditingId(c.id);
    setName(c.name);
    setRelationOrRole(c.relationOrRole);
    setPhone(c.phone);
    setCategory(c.category);
    setPriority(c.priority);
    setShowForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    upsertEmergencyContact({
      id: editingId || undefined,
      name: name.trim(),
      relationOrRole: relationOrRole.trim() || (category === 'doctor' ? 'Doctor' : 'Family'),
      phone: phone.trim(),
      category,
      priority: Number(priority) || 5,
      modeScope: category === 'nurse_station' ? 'hospital' : 'all',
      editable: true,
    });
    setShowForm(false);
  };

  const handleAlertAllFamily = async () => {
    await triggerSosAlert(mode, 'Alert All Family / Emergency Contacts');
    setBroadcastDone(true);
    try {
      speak('Alerting all priority emergency contacts now.', 'en-IN');
    } catch {
      // ignore
    }
    window.setTimeout(() => setBroadcastDone(false), 5000);
  };

  return (
    <section
      className="rounded-3xl bg-white border-2 border-[#E2E7E3] p-5 sm:p-7 shadow-sm"
      aria-labelledby="emergency-panel-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 id="emergency-panel-title" className="text-[clamp(1.2rem,2vw,1.5rem)] font-bold text-[#161B18]">
              Emergency Services &amp; Priority Contacts
            </h2>
            <p className="text-sm text-[#4F5B54]">
              One-tap tel: calling works even without internet, camera, or AI.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleAlertAllFamily()}
            className="min-h-[64px] px-5 py-3 rounded-2xl bg-amber-600 text-white font-bold inline-flex items-center gap-2 hover:bg-amber-700 cursor-pointer"
          >
            <Megaphone className="w-5 h-5" />
            <span>Alert All Family</span>
          </button>

          {onTriggerSos && (
            <button
              type="button"
              onClick={onTriggerSos}
              className="min-h-[64px] px-5 py-3 rounded-2xl bg-red-600 text-white font-extrabold inline-flex items-center gap-2 hover:bg-red-700 cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>Start SOS Countdown</span>
            </button>
          )}
        </div>
      </div>

      {broadcastDone && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-300 text-red-900 font-bold text-sm" role="alert">
          All priority family &amp; {mode === 'hospital' ? 'nurse station ' : ''}contacts notified!
        </div>
      )}

      {/* Regional Number Disclaimer */}
      <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium">
        Note: Default emergency numbers (108 Ambulance, 102 Ambulance, 112 National Emergency) are configured for India. Please verify numbers for your local region.
      </div>

      {/* Priority Emergency Cards (Responsive 3 -> 2 -> 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleContacts.map((c) => {
          const isSystemUrgent =
            c.category === 'ambulance' || c.category === 'national' || c.category === 'nurse_station';

          return (
            <div
              key={c.id}
              className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 ${
                isSystemUrgent ? 'bg-red-50/70 border-red-200' : 'bg-[#F7F9F7] border-[#E2E7E3]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-black/10 text-[#4F5B54] mb-1">
                    Priority #{c.priority} · {c.category.replace('_', ' ')}
                  </span>
                  <h3 className="text-lg font-bold text-[#161B18]">{c.name}</h3>
                  <p className="text-sm text-[#4F5B54]">{c.relationOrRole}</p>
                </div>
                {c.category === 'ambulance' && <Ambulance className="w-6 h-6 text-red-600 shrink-0" />}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={`tel:${c.phone.replace(/\s+/g, '')}`}
                  className={`flex-1 min-h-[64px] px-4 py-3 rounded-xl font-extrabold text-base inline-flex items-center justify-center gap-2 ${
                    isSystemUrgent
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-[#134E32] text-white hover:bg-[#0E3D27]'
                  }`}
                  aria-label={`Call ${c.name} at ${c.phone}`}
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Call {c.phone}</span>
                </a>

                {canEdit && c.editable && (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="min-h-[64px] min-w-[64px] p-3 rounded-xl bg-white border border-[#CBD5E1] text-[#161B18] inline-flex items-center justify-center"
                      aria-label={`Edit ${c.name}`}
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEmergencyContact(c.id)}
                      className="min-h-[64px] min-w-[64px] p-3 rounded-xl bg-white border border-red-200 text-red-700 inline-flex items-center justify-center"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for custom family/doctor contacts */}
      {customContacts.length === 0 && (
        <div className="mt-4 p-4 rounded-2xl bg-[#F8FAFC] border border-dashed border-[#CBD5E1] text-center text-sm text-[#4F5B54]">
          No custom family or doctor contacts added yet.{' '}
          {canEdit ? 'Use "Add Emergency Contact" below to add one.' : 'Ask your caretaker or nurse to add contacts.'}
        </div>
      )}

      {/* Editable Contact Management Footer (Caretaker / Nurse only) */}
      <div className="mt-6 pt-4 border-t border-[#E2E7E3] flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs sm:text-sm font-semibold text-[#4F5B54]">
          {canEdit
            ? 'Editing enabled: You can add, prioritize, and remove family/doctor contacts.'
            : 'Read-only for Patient: Caretaker or Nurse manages emergency contacts.'}
        </span>

        {canEdit && (
          <button
            type="button"
            onClick={startAdd}
            className="min-h-[56px] px-5 py-2.5 rounded-xl bg-[#EAF3ED] border-2 border-[#134E32] text-[#134E32] font-bold inline-flex items-center gap-2 hover:bg-[#DCF0E3] cursor-pointer"
          >
            <UserPlus className="w-5 h-5" />
            <span>Add Emergency Contact</span>
          </button>
        )}
      </div>

      {/* Add / Edit Contact Form Modal */}
      {showForm && canEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Manage Emergency Contact"
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-3xl bg-white border-2 border-[#134E32] p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-xl font-bold text-[#161B18]">
              {editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </h3>
            <div>
              <label className="block text-sm font-bold mb-1">Contact Name</label>
              <input
                type="text"
                className="w-full min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold mb-1">Category</label>
                <select
                  className="w-full min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EmergencyContactCategory)}
                >
                  <option value="family">Family</option>
                  <option value="doctor">Doctor</option>
                  {mode === 'hospital' && <option value="nurse_station">Nurse Station</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Priority Rank</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-full min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Relation / Specialty</label>
              <input
                type="text"
                className="w-full min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                value={relationOrRole}
                onChange={(e) => setRelationOrRole(e.target.value)}
                placeholder="e.g. Son, Cardiologist"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Phone Number</label>
              <input
                type="tel"
                className="w-full min-h-[48px] px-3 rounded-xl border border-[#CBD5E1]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 min-h-[52px] rounded-xl border border-[#CBD5E1] font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[52px] rounded-xl bg-[#134E32] text-white font-bold"
              >
                Save Contact
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
