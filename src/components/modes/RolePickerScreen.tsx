/**
 * RolePickerScreen.tsx - Step 2 Role Picker based on active mode (Home vs Hospital)
 * Includes Staff Authentication step for Hospital Doctor & Hospital Nurse roles.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Users,
  Stethoscope,
  ClipboardPlus,
  ArrowLeft,
  ArrowRight,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { requiresStaffLogin } from '../../lib/permissions';
import { useMode } from './modeContext';
import type { AppRole } from '../../lib/data/types';

interface RoleOption {
  role: AppRole;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
}

export const RolePickerScreen: React.FC = () => {
  const navigate = useNavigate();
  const { mode, selectMode, selectRoleAndEnter } = useMode();
  const activeMode = mode || 'home';

  const [staffLoginRole, setStaffLoginRole] = useState<'doctor' | 'nurse' | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffPin, setStaffPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const roles: RoleOption[] =
    activeMode === 'home'
      ? [
          {
            role: 'patient',
            title: 'Patient / Elder',
            subtitle:
              'Large buttons for AI agent, voice phrases, medicine reminders, I’m okay check-ins, eye & hand gesture control, and SOS.',
            icon: <User className="w-8 h-8" />,
            accent: '#134E32',
          },
          {
            role: 'caretaker',
            title: 'Caretaker / Family',
            subtitle:
              'Monitor patient status, medicine adherence, SOS & quick-phrase alerts, call patient, and manage emergency contacts.',
            icon: <Users className="w-8 h-8" />,
            accent: '#B45309',
          },
        ]
      : [
          {
            role: 'patient',
            title: 'Patient (Bedside)',
            subtitle:
              'Call nurse for water, pain, washroom or help; voice phrases, AI agent, eye & hand control, and bedside SOS.',
            icon: <User className="w-8 h-8" />,
            accent: '#134E32',
          },
          {
            role: 'doctor',
            title: 'Doctor',
            subtitle:
              'Inpatient list, vitals & clinical notes, medicine prescribing, priority alerts, and nurse station coordination. (Staff Login)',
            icon: <Stethoscope className="w-8 h-8" />,
            accent: '#0369A1',
          },
          {
            role: 'nurse',
            title: 'Nurse',
            subtitle:
              'Live room & bed request queue, ward task checklist, handle SOS alerts, and manage hospital emergency contacts. (Staff Login)',
            icon: <ClipboardPlus className="w-8 h-8" />,
            accent: '#0F766E',
          },
        ];

  const handleSelectRole = (chosen: AppRole) => {
    if (requiresStaffLogin(activeMode, chosen)) {
      setStaffLoginRole(chosen as 'doctor' | 'nurse');
      setStaffName(chosen === 'doctor' ? 'Dr. Anjali Sharma' : 'Nurse Kavita Rao');
      setStaffId(chosen === 'doctor' ? 'MED-7849' : 'NUR-3021');
      setStaffPin('1234');
      setLoginError(null);
      return;
    }
    const targetPath = selectRoleAndEnter(chosen);
    navigate(targetPath);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffLoginRole) return;
    if (!staffName.trim() || !staffId.trim() || staffPin.trim().length < 4) {
      setLoginError('Please enter your Name, Staff ID, and a 4-digit PIN (e.g. 1234).');
      return;
    }
    const targetPath = selectRoleAndEnter(staffLoginRole, {
      name: staffName.trim(),
      staffId: staffId.trim(),
      specialty: staffLoginRole === 'doctor' ? 'Cardiologist' : 'Ward Lead',
    });
    navigate(targetPath);
  };

  return (
    <section
      className="min-h-dvh w-full bg-[#F3F5F3] py-8 sm:py-12"
      aria-labelledby="role-picker-heading"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[64px] px-5 py-3 rounded-2xl bg-white border-2 border-[#E2E7E3] text-[#161B18] font-bold inline-flex items-center gap-2 hover:border-[#134E32] transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Change Mode</span>
          </button>

          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E2E7E3]">
            <button
              type="button"
              onClick={() => {
                selectMode('home');
                setStaffLoginRole(null);
              }}
              className={`min-h-[48px] px-4 rounded-xl font-bold text-sm transition ${
                activeMode === 'home' ? 'bg-[#134E32] text-white' : 'text-[#4F5B54]'
              }`}
            >
              Home Mode
            </button>
            <button
              type="button"
              onClick={() => {
                selectMode('hospital');
                setStaffLoginRole(null);
              }}
              className={`min-h-[48px] px-4 rounded-xl font-bold text-sm transition ${
                activeMode === 'hospital' ? 'bg-[#114459] text-white' : 'text-[#4F5B54]'
              }`}
            >
              Hospital Mode
            </button>
          </div>
        </div>

        <div className="max-w-3xl mb-8">
          <h1
            id="role-picker-heading"
            className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-[#161B18]"
          >
            {activeMode === 'home' ? 'Select Home Care Role' : 'Select Hospital Role'}
          </h1>
          <p className="mt-2 text-[clamp(1rem,1.4vw,1.15rem)] text-[#4F5B54]">
            Choose your workspace. Permissions and accessible tools adapt automatically to your role.
          </p>
        </div>

        {/* Role Cards Grid (Responsive 3 -> 2 -> 1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => handleSelectRole(item.role)}
              className="text-left rounded-3xl bg-white p-6 sm:p-8 border-2 border-[#E2E7E3] hover:border-[#134E32] shadow-sm hover:shadow-md transition flex flex-col justify-between min-h-[230px] cursor-pointer"
            >
              <div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-4"
                  style={{ backgroundColor: item.accent }}
                >
                  {item.icon}
                </div>
                <h2 className="text-2xl font-bold text-[#161B18]">{item.title}</h2>
                <p className="mt-2 text-[#4F5B54] text-base leading-relaxed">{item.subtitle}</p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 font-bold text-[#134E32]">
                <span>Open {item.title} Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          ))}
        </div>

        {/* Clinical Staff Login Step (Doctor & Nurse) */}
        {staffLoginRole && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Hospital Staff Login"
          >
            <div className="w-full max-w-md rounded-3xl bg-white border-2 border-[#134E32] p-6 sm:p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF3ED] text-[#134E32] flex items-center justify-center">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#161B18]">
                    {staffLoginRole === 'doctor' ? 'Doctor Verification' : 'Nurse Verification'}
                  </h2>
                  <p className="text-sm text-[#4F5B54]">Mock Hospital SSO (Demo pre-filled)</p>
                </div>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-medium">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleStaffSubmit} className="space-y-4">
                <div>
                  <label htmlFor="staff-name" className="block text-sm font-bold text-[#161B18] mb-1">
                    Full Name
                  </label>
                  <input
                    id="staff-name"
                    type="text"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-[#CBD5E1] text-base"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="staff-id" className="block text-sm font-bold text-[#161B18] mb-1">
                    Hospital Staff ID
                  </label>
                  <input
                    id="staff-id"
                    type="text"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-[#CBD5E1] text-base"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="staff-pin" className="block text-sm font-bold text-[#161B18] mb-1">
                    Access PIN (4+ digits)
                  </label>
                  <input
                    id="staff-pin"
                    type="password"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-[#CBD5E1] text-base"
                    value={staffPin}
                    onChange={(e) => setStaffPin(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStaffLoginRole(null)}
                    className="flex-1 min-h-[52px] px-4 rounded-xl border-2 border-[#CBD5E1] font-bold text-[#161B18]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[52px] px-4 rounded-xl bg-[#134E32] text-white font-bold inline-flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sign In</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
