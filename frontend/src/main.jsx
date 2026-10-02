import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useSearchParams,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  BriefcaseMedical,
  CalendarDays,
  CircleAlert,
  FileText,
  HeartPulse,
  ImageIcon,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCircle2,
  Users,
} from 'lucide-react';
import './styles.css';
import { login, signup } from './services/api/auth.js';
import { createPatient, getMyPatient, getPatient } from './services/api/patients.js';
import { listDoctors } from './services/api/doctors.js';
import { createAppointment, getPatientAppointments } from './services/api/appointments.js';
import { uploadReport, analyzeReport } from './services/api/reports.js';
import { uploadImage, analyzeImage } from './services/api/images.js';
import { createCase, getCase } from './services/api/cases.js';
import { searchKnowledge } from './services/api/rag.js';
import { analyzeOrchestrator } from './services/api/orchestrator.js';
import { getAgentLogs } from './services/api/agentLogs.js';

import heroBackground from './assets/ChatGPT Image Sep 30, 2026, 05_57_23 PM.png';
import clinicalScene from './assets/XsgbuzELTYXu3hPYXU6bNFEaJ1A1uutkK6oIgVPQtG1dez97fr10YORn6An-wWqc1VrY9BWIsYu0WR3pDTHNmVHeYr4vBZl-vPDvyXxMw-ZeIMZHiLM2rk9waETC5RTIuQ3vvjH1nY6zgVRuomwrjSVg2wPGDT8J2N_RXu_qQRobFfm-OG6Nxi96t8mnVXxX.jpg';
import stethoscopeFrame from './assets/2dD5Le378VIxS4GYUilWk_6Vf8DDn3JTqPnftd0FPxtKMT0DfBnjY8fi-UwFn7XOdwc1pjh9Ivj85T7uywo6d7a-u3toLw0oavlQj77xCEbL1vhzo1dU3aQvBdHkn2chzoTFecLjtI_X1rc_xQrnkqbRqnrtrzmkv-1FDAyjwYFi07RxBWPcN5WhR4HHmaob.jpg';

const STORAGE_KEYS = {
  accessToken: 'mahip_access_token',
  refreshToken: 'mahip_refresh_token',
  userId: 'mahip_user_id',
  role: 'mahip_role',
  patientId: 'mahip_patient_id',
  entries: 'mahip_app_entries',
};

const emptyEntries = { reports: [], images: [], cases: [], appointments: [], logs: [], knowledge: [] };

function normalizeRole(role) {
  const value = String(role || '').toLowerCase();
  return value === 'doctor' || value === 'admin' ? 'doctor' : 'patient';
}

function getStoredSession() {
  return {
    accessToken: localStorage.getItem(STORAGE_KEYS.accessToken) || '',
    refreshToken: localStorage.getItem(STORAGE_KEYS.refreshToken) || '',
    userId: localStorage.getItem(STORAGE_KEYS.userId) || '',
    role: normalizeRole(localStorage.getItem(STORAGE_KEYS.role)),
    patientId: localStorage.getItem(STORAGE_KEYS.patientId) || '',
  };
}

function loadEntries() {
  const raw = localStorage.getItem(STORAGE_KEYS.entries);
  if (!raw) return emptyEntries;
  try {
    return { ...emptyEntries, ...JSON.parse(raw) };
  } catch {
    return emptyEntries;
  }
}

const AuthContext = React.createContext(null);
const EntriesContext = React.createContext(null);

function AuthProvider({ children }) {
  const [session, setSession] = React.useState(getStoredSession);

  React.useEffect(() => {
    if (session.accessToken) {
      localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken || '');
      localStorage.setItem(STORAGE_KEYS.userId, session.userId || '');
      localStorage.setItem(STORAGE_KEYS.role, normalizeRole(session.role));
      if (session.patientId) localStorage.setItem(STORAGE_KEYS.patientId, session.patientId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.userId);
      localStorage.removeItem(STORAGE_KEYS.role);
      localStorage.removeItem(STORAGE_KEYS.patientId);
    }
  }, [session]);

  const value = React.useMemo(() => ({
    session,
    setSession,
    isAuthenticated: Boolean(session.accessToken),
    logout: () => setSession({ accessToken: '', refreshToken: '', userId: '', role: 'patient', patientId: '' }),
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function EntriesProvider({ children }) {
  const [entries, setEntries] = React.useState(loadEntries);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  }, [entries]);

  const value = React.useMemo(() => ({
    entries,
    addEntry: (key, value) => setEntries((prev) => ({ ...prev, [key]: [value, ...(prev[key] || [])] })),
    updateEntries: (key, updater) => setEntries((prev) => ({ ...prev, [key]: typeof updater === 'function' ? updater(prev[key] || []) : updater })),
  }), [entries]);

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('AuthContext is missing');
  return context;
}

function useEntries() {
  const context = React.useContext(EntriesContext);
  if (!context) throw new Error('EntriesContext is missing');
  return context;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function PatientOnlyRoute({ children }) {
  const { session } = useAuth();
  return normalizeRole(session.role) === 'patient'
    ? children
    : <Navigate to="/dashboard" replace />;
}

function DoctorOnlyRoute({ children }) {
  const { session } = useAuth();
  return normalizeRole(session.role) === 'doctor'
    ? children
    : <Navigate to="/dashboard" replace />;
}

function LandingPage() {
  return (
    <div className="landing-shell" style={{ backgroundImage: `url(${stethoscopeFrame})` }}>
      <header className="landing-header">
        <div className="brand-row">
          <div className="brand-mark brand-mark-large"><HeartPulse size={18} /></div>
          <div>
            <strong>MAHIP</strong>
            <small>Multi-Agent Healthcare Intelligence Platform</small>
          </div>
        </div>

        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <Link to="/login">Login</Link>
        </nav>

        <div className="landing-actions">
          <Link to="/login" className="btn btn-primary">Get Started</Link>
        </div>
      </header>

      <section id="home" className="hero hero-surface">
        <div className="hero-copy">
          <p className="eyebrow">Healthcare decision support</p>
          <h1>Multi-Agent Healthcare Intelligence Platform</h1>
          <p className="lead">AI-assisted healthcare decision support that brings patient context, medical reports, chest X-rays, and clinical knowledge into one connected workflow.</p>
          <div className="landing-actions hero-actions">
            <Link to="/login" className="btn btn-primary">Get Started <ArrowRight size={16} /></Link>
            <a href="#features" className="btn btn-secondary">Explore features</a>
          </div>
          <div className="hero-badges">
            <span>Patient context</span>
            <span>Medical reports</span>
            <span>AI analysis</span>
          </div>
        </div>

        <div className="hero-panel hero-panel-visual" aria-label="AI healthcare interface panel">
          <div className="mini-card">
            <ShieldCheck size={18} />
            <div>
              <strong>AI-assisted clinical support</strong>
              <span>Not a definitive diagnosis</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><strong>Patients</strong><span>360° context</span></div>
            <div><strong>Reports</strong><span>PDF + TXT review</span></div>
            <div><strong>X-rays</strong><span>AI workflow</span></div>
            <div><strong>Knowledge</strong><span>RAG search</span></div>
          </div>
        </div>
      </section>

      <section id="about" className="info-section">
        <div className="info-copy">
          <p className="eyebrow">Clinical intelligence</p>
          <h2>MAHIP coordinates specialized agents across care, imaging, and medical knowledge.</h2>
          <p>From patient context to document review and chest X-ray analysis, the platform helps clinicians assemble a more complete picture before a decision is made.</p>
          <ul className="check-list">
            <li>Patient context and care records</li>
            <li>Medical report and imaging review</li>
            <li>Chest X-ray analysis support</li>
            <li>Medical knowledge retrieval</li>
            <li>AI-assisted decision support</li>
          </ul>
        </div>

      </section>

      <section id="features" className="feature-section">
        <div className="section-heading">
          <p className="eyebrow">Platform capabilities</p>
          <h2>Healthcare workflows designed for clarity and trust.</h2>
        </div>

        <div className="feature-grid feature-grid-compact">
          <div className="feature-card feature-card-health">
            <UserCircle2 size={20} />
            <h3>Patients</h3>
            <p>360° context</p>
          </div>
          <div className="feature-card feature-card-health">
            <FileText size={20} />
            <h3>Reports</h3>
            <p>PDF + TXT review</p>
          </div>
          <div className="feature-card feature-card-health">
            <ImageIcon size={20} />
            <h3>X-rays</h3>
            <p>AI workflow</p>
          </div>
          <div className="feature-card feature-card-health">
            <Search size={20} />
            <h3>Knowledge</h3>
            <p>RAG search</p>
          </div>
        </div>
      </section>

      <section className="workflow-section">
        <div className="section-heading">
          <p className="eyebrow">Multi-agent workflow</p>
          <h2>Clinical reasoning in a connected chain.</h2>
        </div>

        <div className="workflow-steps">
          <div className="workflow-step"><span>User Input</span></div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-step"><span>Patient Agent</span></div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-step"><span>Report / X-ray Agents</span></div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-step"><span>RAG Agent</span></div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-step"><span>Diagnosis Support Agent</span></div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-step"><span>Safety Check</span></div>
          <div className="workflow-arrow">↓</div>
          <div className="workflow-step"><span>Case Result</span></div>
        </div>
      </section>

      <section className="safety-section">
        <div className="safety-box">
          <ShieldCheck size={22} />
          <div>
            <h3>AI-assisted decision support</h3>
            <p>MAHIP supports clinical reasoning and is not a definitive medical diagnosis.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="brand-row">
          <div className="brand-mark"><HeartPulse size={16} /></div>
          <div>
            <strong>MAHIP</strong>
            <small>Clinical intelligence</small>
          </div>
        </div>
        <p>Built for patient context, imaging insight, and safer clinical workflow support.</p>
      </footer>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = React.useState({ email: '', password: '' });
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await login(form);
      setSession({
        accessToken: response.access_token || '',
        refreshToken: response.refresh_token || '',
        userId: response.user_id || '',
        role: normalizeRole(response.role),
        patientId: localStorage.getItem(STORAGE_KEYS.patientId) || '',
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell auth-shell-medical" style={{ backgroundImage: `url(${heroBackground})` }}>
      <img className="stethoscope-frame" src={stethoscopeFrame} alt="" aria-hidden="true" />

      <div className="auth-card auth-card-medical">
        <div className="auth-header">
          <div className="brand-mark"><HeartPulse size={18} /></div>
          <div>
            <h2>Welcome back</h2>
            <p>Sign in to your MAHIP workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@mahip.health" required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
          </label>

          {error && <div className="notice error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? <><LoaderCircle className="spinner" size={16} /> Signing in...</> : 'Login'}
          </button>

          <div className="auth-footer">
            <a href="#">Forgot password</a>
            <Link to="/signup">Signup</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignupPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [form, setForm] = React.useState({ full_name: '', email: '', password: '', confirm_password: '', role: 'patient' });
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const response = await signup({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      });

      setSession({
        accessToken: response.access_token || '',
        refreshToken: response.refresh_token || '',
        userId: response.user_id || '',
        role: normalizeRole(response.role || form.role),
        patientId: localStorage.getItem(STORAGE_KEYS.patientId) || '',
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell auth-shell-medical auth-shell-signup" style={{ backgroundImage: `url(${heroBackground})` }}>
      <img className="stethoscope-frame stethoscope-frame-signup" src={stethoscopeFrame} alt="" aria-hidden="true" />

      <div className="auth-card auth-card-medical">
        <div className="auth-header">
          <div className="brand-mark"><HeartPulse size={18} /></div>
          <div>
            <h2>Create your account</h2>
            <p>Join the MAHIP healthcare workflow</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="form-stack">
          <label>
            <span>Name</span>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Alex Morgan" required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@mahip.health" required />
          </label>
          <label>
            <span>Role</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
          </label>
          <label>
            <span>Confirm password</span>
            <input type="password" value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} required />
          </label>

          {error && <div className="notice error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? <><LoaderCircle className="spinner" size={16} /> Creating account...</> : 'Signup'}
          </button>

          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function AppLayout() {
  const { session, logout } = useAuth();
  const role = normalizeRole(session.role);
  const navItems = role === 'doctor' ? [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profile', label: 'My Profile', icon: UserCircle2 },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/images', label: 'X-rays', icon: ImageIcon },
    { to: '/cases', label: 'Cases', icon: BriefcaseMedical },
    { to: '/ai-analysis', label: 'AI Analysis', icon: Bot },
    { to: '/knowledge', label: 'Knowledge', icon: Search },
    { to: '/agent-activity', label: 'Agent Activity', icon: Activity },
    { to: '/settings', label: 'Settings', icon: Settings },
  ] : [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/profile', label: 'My Profile', icon: UserCircle2 },
    { to: '/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/appointments', label: 'Appointments', icon: CalendarDays },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/images', label: 'X-rays', icon: ImageIcon },
    { to: '/cases', label: 'My Cases', icon: BriefcaseMedical },
    { to: '/ai-analysis', label: 'AI Analysis', icon: Bot },
    { to: '/knowledge', label: 'Knowledge', icon: Search },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark"><HeartPulse size={18} /></div>
          <div>
            <strong>MAHIP</strong>
            <small>Clinical intelligence</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <UserCircle2 size={16} />
            <span>{session.userId || 'Healthcare user'}</span>
          </div>
          <button className="btn btn-ghost btn-block" type="button" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="content-panel">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/patients" element={<DoctorOnlyRoute><PatientsPage /></DoctorOnlyRoute>} />
          <Route path="/patients/:id" element={<DoctorOnlyRoute><PatientDetailPage /></DoctorOnlyRoute>} />
          <Route path="/doctors" element={<PatientOnlyRoute><DoctorsPage /></PatientOnlyRoute>} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/images" element={<ImagesPage />} />
          <Route path="/images/:id" element={<ImageDetailPage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/:id" element={<CaseDetailPage />} />
          <Route path="/ai-analysis" element={<AIAnalysisPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
          <Route path="/agent-activity" element={<DoctorOnlyRoute><AgentActivityPage /></DoctorOnlyRoute>} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function DashboardPage() {
  const { session } = useAuth();
  const { entries } = useEntries();
  const role = normalizeRole(session.role);
  const [doctors, setDoctors] = React.useState([]);
  const [appointments, setAppointments] = React.useState([]);
  const [patient, setPatient] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [creatingPatient, setCreatingPatient] = React.useState(false);
  const [createPatientError, setCreatePatientError] = React.useState('');
  const [patientRefresh, setPatientRefresh] = React.useState(0);

  async function handleCreatePatient() {
    setCreatingPatient(true);
    setCreatePatientError('');
    try {
      const created = await createPatient({ profile_id: session.userId });
      localStorage.setItem(STORAGE_KEYS.patientId, created.id);
      setPatient(created);
      setPatientRefresh((value) => value + 1);
    } catch (err) {
      setCreatePatientError(err.message || 'Unable to create your patient record. Please try again.');
    } finally {
      setCreatingPatient(false);
    }
  }

  React.useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError('');
        if (role === 'doctor') {
          const doctorList = await listDoctors();
          setDoctors(Array.isArray(doctorList) ? doctorList : []);
          setPatient(null);
          setAppointments([]);
          return;
        }

        const requests = [listDoctors(), getMyPatient()];
        const results = await Promise.allSettled(requests);
        const failures = [];

        if (results[0].status === 'fulfilled') {
          setDoctors(Array.isArray(results[0].value) ? results[0].value : []);
        } else failures.push(results[0].reason?.message || 'Unable to load doctors.');

        if (results[1].status === 'fulfilled') {
          const currentPatient = results[1].value;
          setPatient(currentPatient);
          localStorage.setItem(STORAGE_KEYS.patientId, currentPatient.id);
          try {
            const patientAppointments = await getPatientAppointments(currentPatient.id);
            setAppointments(Array.isArray(patientAppointments) ? patientAppointments : []);
          } catch (appointmentError) {
            failures.push(appointmentError.message || 'Unable to load appointments.');
          }
        } else if (results[1].reason?.message?.includes('Patient record has not been created')) {
          setPatient(null);
          setAppointments([]);
        } else {
          failures.push(results[1].reason?.message || 'Unable to load the patient record.');
          setAppointments([]);
        }

        setError(failures.join(' '));
      } catch (err) {
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [session.userId, session.role, patientRefresh]);

  if (loading) {
    return <PageLoader title={role === 'doctor' ? 'Doctor Dashboard' : 'Patient Dashboard'} />;
  }

  if (role === 'doctor') {
    const recentCase = (entries.cases || [])[0];
    return (
      <div className="page-content">
        <PageHeader title="Doctor Dashboard" subtitle="Patient context, appointments, reports, imaging, and clinical workflow support." />
        {error && <div className="notice error">{error}</div>}

        <div className="stats-grid">
          <div className="stat-card navy"><span>My Patients</span><strong>{doctors.length || 0}</strong></div>
          <div className="stat-card teal"><span>Today's Appointments</span><strong>{appointments.length || 0}</strong></div>
          <div className="stat-card green"><span>Pending Reviews</span><strong>{recentCase ? '1' : '0'}</strong></div>
          <div className="stat-card navy"><span>Recent Cases</span><strong>{(entries.cases || []).length || 0}</strong></div>
        </div>

        <div className="two-column-grid">
          <section className="panel">
            <div className="panel-head"><h3>Today's Appointments</h3></div>
            {appointments.length ? (
              <div className="list-stack">{appointments.slice(0, 4).map((appointment) => (
                <div className="list-row" key={appointment.id || `${appointment.patient_id}-${appointment.appointment_date}`}>
                  <div>
                    <strong>{appointment.reason || 'Consultation'}</strong>
                    <small>{appointment.patient_id || 'Patient'} · {appointment.appointment_date || 'Date unavailable'} {appointment.appointment_time ? `@ ${appointment.appointment_time}` : ''}</small>
                  </div>
                  <span className="tag">{appointment.status || 'Scheduled'}</span>
                </div>
              ))}</div>
            ) : (
              <EmptyState title="No appointments today" description="No upcoming appointments are currently available." />
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Patients Requiring Review</h3></div>
            {doctors.length ? (
              <div className="list-stack">{doctors.slice(0, 4).map((doctor) => (
                <div className="list-row" key={doctor.id || doctor.doctor_id || doctor.profile_id}>
                  <div>
                    <strong>{doctor.full_name || doctor.name || 'Doctor'}</strong>
                    <small>{doctor.specialization || 'Specialization not provided'}</small>
                  </div>
                  <span className="tag">{doctor.is_available === true ? 'Available' : 'Availability not provided'}</span>
                </div>
              ))}</div>
            ) : (
              <EmptyState title="No patients yet" description="Patients associated with your care workflow will appear here." />
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Recent Reports</h3></div>
            {(entries.reports || []).length ? (
              <div className="list-stack">{(entries.reports || []).slice(0, 3).map((report) => (
                <div className="list-row" key={report.id}><div><strong>{report.file_name || 'Medical report'}</strong><small>{report.analysis_status || 'pending'}</small></div><Link to={`/reports/${report.id}`} className="muted-link">Open</Link></div>
              ))}</div>
            ) : (
              <EmptyState title="No reports yet" description="Recent patient reports will appear here." />
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Recent X-rays</h3></div>
            {(entries.images || []).length ? (
              <div className="list-stack">{(entries.images || []).slice(0, 3).map((image) => (
                <div className="list-row" key={image.id}><div><strong>{image.file_name || 'Chest X-ray'}</strong><small>{image.analysis_status || 'pending'}</small></div><Link to={`/images/${image.id}`} className="muted-link">Open</Link></div>
              ))}</div>
            ) : (
              <EmptyState title="No X-rays yet" description="Recent imaging studies will appear here." />
            )}
          </section>

          <section className="panel">
            <div className="panel-head"><h3>Recent AI-assisted Cases</h3></div>
            {(entries.cases || []).length ? (
              <div className="list-stack">{(entries.cases || []).slice(0, 3).map((item) => (
                <div className="list-row" key={item.id}><div><strong>{item.status || 'Case'}</strong><small>{item.clinical_summary || 'Summary pending'}</small></div><Link to={`/cases/${item.id}`} className="muted-link">Review</Link></div>
              ))}</div>
            ) : (
              <EmptyState title="No cases requiring review" description="Cases requiring review will appear here." />
            )}
          </section>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'My Patient Record', value: patient ? 'Available' : 'Not set', tone: 'navy' },
    { label: 'Upcoming Appointments', value: appointments.length, tone: 'teal' },
    { label: 'My Reports', value: (entries.reports || []).length, tone: 'green' },
    { label: 'My X-rays', value: (entries.images || []).length, tone: 'navy' },
  ];

  const recentCase = (entries.cases || [])[0];

  return (
    <div className="page-content">
      <PageHeader title="Patient Dashboard" subtitle="Your health context, appointments, reports, and AI-assisted care workflow." />
      {error && <div className="notice error">{error}</div>}

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className={`stat-card ${stat.tone}`} key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-head"><h3>My Health Snapshot</h3></div>
          {patient ? (
            <div className="detail-list">
              <div><span>Profile ID</span><strong>{patient.profile_id}</strong></div>
              <div><span>Gender</span><strong>{patient.gender || 'Not specified'}</strong></div>
              <div><span>Blood group</span><strong>{patient.blood_group || 'Not specified'}</strong></div>
              <div><span>Medical history</span><strong>{patient.medical_history || 'No history recorded'}</strong></div>
            </div>
          ) : (
            <div className="empty-state">
              <strong>Your patient profile has not been created yet.</strong>
              <p>Create your patient record to connect your healthcare information.</p>
              {createPatientError && <div className="notice error">{createPatientError}</div>}
              <button className="btn btn-primary" type="button" onClick={handleCreatePatient} disabled={creatingPatient || !session.userId}>
                {creatingPatient ? <><LoaderCircle className="spinner" size={16} /> Creating...</> : 'Create Patient Record'}
              </button>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Care Team</h3></div>
          {doctors.length ? (
            <div className="list-stack">{doctors.slice(0, 4).map((doctor) => (
              <div className="list-row" key={doctor.id || doctor.doctor_id || doctor.full_name}>
                <div>
                  <strong>{doctor.full_name || doctor.name || 'Doctor'}</strong>
                  <small>{doctor.specialization || 'Specialization not provided'}</small>
                </div>
                <span className="tag">{doctor.is_available === true ? 'Available' : 'Availability not provided'}</span>
              </div>
            ))}</div>
          ) : (
            <EmptyState title="No doctors available" description="Available doctors will appear here once the backend returns records." />
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>My Upcoming Appointments</h3></div>
          {appointments.length ? (
            <div className="list-stack">{appointments.slice(0, 5).map((appointment) => (
              <div className="list-row" key={appointment.id}>
                <div>
                  <strong>{appointment.reason || 'Consultation'}</strong>
                  <small>{appointment.appointment_date} {appointment.appointment_time ? `at ${appointment.appointment_time}` : ''}</small>
                </div>
                <span className="tag">{appointment.status || 'Scheduled'}</span>
              </div>
            ))}</div>
          ) : (
            <EmptyState title="No appointments yet" description="Book an appointment with an available doctor." action={{ label: 'Book Appointment', to: '/appointments' }} />
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Recent Reports</h3></div>
          {(entries.reports || []).length ? (
            <div className="list-stack">{(entries.reports || []).slice(0, 3).map((report) => (
              <div className="list-row" key={report.id}><div><strong>{report.file_name || 'Medical report'}</strong><small>{report.analysis_status || 'pending'}</small></div><Link to={`/reports/${report.id}`} className="muted-link">Open</Link></div>
            ))}</div>
          ) : (
            <EmptyState title="No reports yet" description="Upload a medical report to begin." />
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Recent X-Rays</h3></div>
          {(entries.images || []).length ? (
            <div className="list-stack">{(entries.images || []).slice(0, 3).map((image) => (
              <div className="list-row" key={image.id}><div><strong>{image.file_name || 'Chest X-ray'}</strong><small>{image.analysis_status || 'pending'}</small></div><Link to={`/images/${image.id}`} className="muted-link">Open</Link></div>
            ))}</div>
          ) : (
            <EmptyState title="No X-rays yet" description="Upload a chest X-ray for AI-assisted image analysis." />
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>AI-Assisted Case Summary</h3></div>
          {recentCase ? (
            <div className="detail-list">
              <div><span>Status</span><strong>{recentCase.status || 'Active'}</strong></div>
              <div><span>Summary</span><strong>{recentCase.clinical_summary || 'No summary available yet.'}</strong></div>
            </div>
          ) : (
            <EmptyState title="No case summary yet" description="Create or run a case workflow to generate an AI-assisted summary." action={{ label: 'Open Cases', to: '/cases' }} />
          )}
        </section>
      </div>
    </div>
  );
}

function ProfilePage() {
  const { session } = useAuth();
  const role = normalizeRole(session.role);
  const [patient, setPatient] = React.useState(null);
  const [doctor, setDoctor] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        if (role === 'doctor') {
          const doctors = await listDoctors();
          const matchedDoctor = (doctors || []).find((item) => (
            item.profile_id === session.userId ||
            item.id === session.userId ||
            item.user_id === session.userId ||
            item.email === session.userId
          ));
          setDoctor(matchedDoctor || null);
          setPatient(null);
          return;
        }

        const patientRecord = await getMyPatient();
        localStorage.setItem(STORAGE_KEYS.patientId, patientRecord.id);
        setPatient(patientRecord);
      } catch {
        setPatient(null);
        setDoctor(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session.userId, session.role]);

  if (loading) return <PageLoader title={role === 'doctor' ? 'Doctor Profile' : 'Profile'} />;

  if (role === 'doctor') {
    if (!doctor) {
      return (
        <div className="page-content">
          <PageHeader title="My Profile" subtitle="Doctor profile and care specialty." />
          <EmptyState title="Doctor profile not available" description="Your doctor profile record is not currently available from the backend." />
        </div>
      );
    }

    return (
      <div className="page-content">
        <PageHeader title="My Profile" subtitle="Doctor profile and clinical availability." />
        <section className="panel detail-panel">
          <div className="detail-list">
            <div><span>Name</span><strong>{doctor.full_name || doctor.name || 'Not provided'}</strong></div>
            <div><span>Specialty</span><strong>{doctor.specialization || doctor.specialty || 'Not provided'}</strong></div>
            <div><span>Availability</span><strong>{typeof doctor.is_available === 'boolean' ? (doctor.is_available ? 'Available' : 'Unavailable') : 'Not provided'}</strong></div>
            <div><span>Bio</span><strong>{doctor.bio || 'No biography provided.'}</strong></div>
          </div>
        </section>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="page-content">
        <PageHeader title="My Profile" subtitle="Personal information and care history." />
        <EmptyState title="Your patient profile has not been created yet." description="Create your patient record to connect your healthcare information." action={{ label: 'Create Patient Record', to: '/patients' }} />
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader title="My Profile" subtitle="Clinical profile details." />
      <section className="panel detail-panel">
        <div className="detail-list">
          <div><span>Profile ID</span><strong>{patient.profile_id}</strong></div>
          <div><span>Date of birth</span><strong>{patient.date_of_birth || 'Not specified'}</strong></div>
          <div><span>Gender</span><strong>{patient.gender || 'Not specified'}</strong></div>
          <div><span>Blood group</span><strong>{patient.blood_group || 'Not specified'}</strong></div>
          <div><span>Medical history</span><strong>{patient.medical_history || 'No history recorded'}</strong></div>
          <div><span>Allergies</span><strong>{patient.allergies || 'No allergies recorded'}</strong></div>
          <div><span>Emergency contact</span><strong>{patient.emergency_contact_name || 'Not provided'}</strong></div>
          <div><span>Contact phone</span><strong>{patient.emergency_contact_phone || 'Not provided'}</strong></div>
        </div>
      </section>
    </div>
  );
}

function PatientsPage() {
  const { session } = useAuth();

  if (normalizeRole(session.role) !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page-content">
      <PageHeader title="Patients" subtitle="Authorized patient records and care workflow visibility." />
      <section className="panel">
        <div className="panel-head"><h3>Assigned patients</h3></div>
        <EmptyState title="No patients yet" description="Patients associated with your care workflow will appear here." />
      </section>
    </div>
  );
}

function PatientDetailPage() {
  const { id } = useParams();
  const [patient, setPatient] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getPatient(id)
      .then((record) => setPatient(record))
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader title="Patient details" />;
  if (!patient) return <EmptyState title="Patient not found." description="The requested patient record was not returned by the backend." />;

  return (
    <div className="page-content">
      <PageHeader title="Patient record" subtitle={`Showing details for ${patient.profile_id}`} />
      <section className="panel detail-panel">
        <div className="detail-list">
          <div><span>Patient ID</span><strong>{patient.id}</strong></div>
          <div><span>Profile ID</span><strong>{patient.profile_id}</strong></div>
          <div><span>Date of birth</span><strong>{patient.date_of_birth || 'Not specified'}</strong></div>
          <div><span>Gender</span><strong>{patient.gender || 'Not specified'}</strong></div>
          <div><span>Blood group</span><strong>{patient.blood_group || 'Not specified'}</strong></div>
          <div><span>Medical history</span><strong>{patient.medical_history || 'No history recorded'}</strong></div>
        </div>
      </section>
    </div>
  );
}

function DoctorsPage() {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    listDoctors()
      .then((data) => setDoctors(data || []))
      .catch((err) => setError(err.message || 'Unable to load doctors.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader title="Doctors" />;

  return (
    <div className="page-content">
      <PageHeader title="Doctors" subtitle="Medical specialist records returned by the backend." />
      {error ? <div className="notice error">Unable to load doctors. Please try again. {error}</div> : doctors.length ? (
        <div className="card-grid">
          {doctors.map((doctor) => (
            <div className="panel card-tile" key={doctor.id}>
              <div className="card-headline">
                <div className="icon-pill"><Stethoscope size={16} /></div>
                <div>
                  <strong>{doctor.name || `Doctor ${doctor.id}`}</strong>
                  <small>{doctor.specialization || 'Specialization not provided'}</small>
                </div>
              </div>
              {doctor.bio && <p>{doctor.bio}</p>}
              <div className="detail-list">
                <div><span>Qualification</span><strong>{doctor.qualification || 'Not provided'}</strong></div>
                <div><span>Experience</span><strong>{doctor.experience_years ?? 'Not provided'}{doctor.experience_years == null ? '' : ' years'}</strong></div>
                <div><span>Consultation fee</span><strong>{doctor.consultation_fee == null ? 'Not provided' : doctor.consultation_fee}</strong></div>
              </div>
              <span className="tag">{doctor.is_available ? 'Available' : 'Unavailable'}</span>
              <Link
                className="btn btn-primary"
                to={`/appointments?doctor_id=${encodeURIComponent(doctor.id)}`}
                aria-disabled={!doctor.is_available}
                onClick={(event) => { if (!doctor.is_available) event.preventDefault(); }}
              >
                Book Appointment
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No doctors are currently available." description="There are no doctor records configured in the backend yet." />
      )}
    </div>
  );
}

function AppointmentsPage() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const role = normalizeRole(session.role);
  const [doctors, setDoctors] = React.useState([]);
  const [appointments, setAppointments] = React.useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = React.useState(true);
  const [appointmentsError, setAppointmentsError] = React.useState('');
  const [doctorsLoading, setDoctorsLoading] = React.useState(true);
  const [doctorsError, setDoctorsError] = React.useState('');
  const [form, setForm] = React.useState({
    patient_id: '',
    doctor_id: searchParams.get('doctor_id') || '',
    appointment_date: '',
    appointment_time: '09:00',
    reason: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;
    if (role !== 'patient') {
      setAppointments([]);
      setAppointmentsLoading(false);
      setDoctorsLoading(false);
      return () => { active = false; };
    }

    async function loadAppointmentData() {
      setAppointmentsLoading(true);
      setDoctorsLoading(true);
      setAppointmentsError('');
      setDoctorsError('');
      const [doctorResult, patientResult] = await Promise.allSettled([listDoctors(), getMyPatient()]);

      if (!active) return;
      if (doctorResult.status === 'fulfilled') {
        setDoctors(Array.isArray(doctorResult.value) ? doctorResult.value : []);
      } else {
        setDoctors([]);
        setDoctorsError('Unable to load doctors. Please try again.');
      }
      setDoctorsLoading(false);

      if (patientResult.status === 'fulfilled') {
        const patientId = patientResult.value.id;
        localStorage.setItem(STORAGE_KEYS.patientId, patientId);
        setForm((prev) => ({ ...prev, patient_id: patientId }));
        try {
          const patientAppointments = await getPatientAppointments(patientId);
          if (active) setAppointments(Array.isArray(patientAppointments) ? patientAppointments : []);
        } catch (err) {
          if (active) setAppointmentsError(err.message || 'Unable to load appointments.');
        }
      } else {
        setAppointments([]);
        setForm((prev) => ({ ...prev, patient_id: '' }));
        if (active) setAppointmentsError('Create your patient record before booking an appointment.');
      }
      if (active) setAppointmentsLoading(false);
    }

    loadAppointmentData().catch((err) => {
      if (active) {
        setAppointmentsError(err.message || 'Unable to load appointment data.');
        setAppointmentsLoading(false);
        setDoctorsLoading(false);
      }
    });

    return () => { active = false; };
  }, [session.userId, role]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (role !== 'patient') return;
    setLoading(true);
    setError('');

    try {
      const appointment = await createAppointment(form);
      setAppointments((current) => [appointment, ...current.filter((item) => item.id !== appointment.id)]);
      setForm({ ...form, doctor_id: '', appointment_date: '', appointment_time: '09:00', reason: '' });
      const patientId = localStorage.getItem(STORAGE_KEYS.patientId);
      if (patientId) {
        try {
          const currentAppointments = await getPatientAppointments(patientId);
          setAppointments(Array.isArray(currentAppointments) ? currentAppointments : []);
          setAppointmentsError('');
        } catch (err) {
          setAppointmentsError(err.message || 'Appointment was created, but the list could not be refreshed.');
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to create appointment.');
    } finally {
      setLoading(false);
    }
  }

  if (role === 'doctor') {
    return (
      <div className="page-content">
        <PageHeader title="Appointments" subtitle="Review incoming and scheduled patient visits." />
        <div className="two-column-grid">
          <section className="panel">
            <div className="panel-head"><h3>Upcoming Appointments</h3></div>
            <EmptyState title="No upcoming appointments are currently available." description="Incoming visits will appear here when the backend exposes doctor-scoped appointment data." />
          </section>
          <section className="panel">
            <div className="panel-head"><h3>Today's Appointments</h3></div>
            <EmptyState title="No appointments today" description="No upcoming appointments are currently available." />
          </section>
          <section className="panel">
            <div className="panel-head"><h3>Recent Appointments</h3></div>
            <EmptyState title="No recent appointments" description="Recent patient appointments will appear here when available." />
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader title="Appointments" subtitle="Schedule and review patient appointments." />
      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-head"><h3>Book an appointment</h3></div>
          <form onSubmit={handleSubmit} className="form-stack">
            <label>
              <span>Patient ID</span>
              <input type="text" value={form.patient_id || ''} readOnly required />
            </label>
            <label>
              <span>Doctor</span>
              <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} required disabled={doctorsLoading || Boolean(doctorsError)}>
                <option value="">{doctorsLoading ? 'Loading doctors...' : doctorsError ? 'Doctors unavailable' : 'Select a doctor'}</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id} disabled={doctor.is_available === false}>
                    {doctor.name || `Doctor ${doctor.id}`} {doctor.is_available === false ? '(Unavailable)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Date</span>
              <input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required />
            </label>
            <label>
              <span>Time</span>
              <input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} required />
            </label>
            <label>
              <span>Reason</span>
              <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for consultation" />
            </label>
            {doctorsError && <div className="notice error">{doctorsError}</div>}
            {error && <div className="notice error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading || !form.patient_id || !doctors.length || Boolean(doctorsError)}>
              {loading ? <><LoaderCircle className="spinner" size={16} /> Saving...</> : 'Create appointment'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>My upcoming appointments</h3></div>
          {appointmentsError && <div className="notice error">{appointmentsError}</div>}
          {appointmentsLoading ? <p className="muted-text">Loading appointments...</p> : appointments.length ? (
            <div className="list-stack">
              {appointments.map((appointment) => (
                <div className="list-row" key={appointment.id}>
                  <div>
                    <strong>{appointment.reason || 'No reason provided'}</strong>
                    <small>{appointment.appointment_date} @ {appointment.appointment_time}</small>
                  </div>
                  <span className="tag">{appointment.status || 'Scheduled'}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No appointments yet" description="Book an appointment with an available doctor." />
          )}
        </section>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { session } = useAuth();
  const { entries, addEntry, updateEntries } = useEntries();
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');

  async function handleUpload(e) {
    e.preventDefault();
    const patientId = localStorage.getItem(STORAGE_KEYS.patientId) || session.patientId || '';
    if (!patientId || !file) {
      setError('Create a patient profile and choose a PDF or TXT report file.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStatus('Uploading');
      const uploaded = await uploadReport({ patientId, file });
      addEntry('reports', uploaded);
      setStatus('Processing');
      const analyzed = await analyzeReport(uploaded.id);
      const analyzedRecord = analyzed.record || { ...uploaded, analysis_result: analyzed.analysis, analysis_status: analyzed.status };
      updateEntries('reports', (current) => [analyzedRecord, ...current.filter((item) => item.id !== uploaded.id)]);
      setStatus('Completed');
      setFile(null);
      e.target.reset();
    } catch (err) {
      setStatus('Failed');
      setError(err.message || 'Unable to process this report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="Medical reports" subtitle="Upload PDF or TXT reports and analyze them with the backend agent." />
      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-head"><h3>Upload report</h3></div>
          <form onSubmit={handleUpload} className="form-stack">
            <label>
              <span>Patient ID</span>
              <input type="text" value={localStorage.getItem(STORAGE_KEYS.patientId) || ''} readOnly />
            </label>
            <label>
              <span>Report file</span>
              <input type="file" accept=".pdf,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </label>
            {error && <div className="notice error">{error}</div>}
            {status && <div className="notice info">Status: {status}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><LoaderCircle className="spinner" size={16} /> Uploading...</> : 'Upload and analyze'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Recent reports</h3></div>
          {(entries.reports || []).length ? (
            <div className="list-stack">
              {(entries.reports || []).map((report) => (
                <div className="list-row" key={report.id}>
                  <div>
                    <strong>{report.file_name || 'Medical report'}</strong>
                    <small>{report.analysis_status || 'pending'}</small>
                  </div>
                  <Link to={`/reports/${report.id}`} className="muted-link">Open</Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No medical reports yet." description="Upload your first report to begin." action={{ label: 'Upload report', to: '/reports' }} />
          )}
        </section>
      </div>
    </div>
  );
}

function ReportDetailPage() {
  const { id } = useParams();
  const { entries } = useEntries();
  const report = (entries.reports || []).find((item) => item.id === id);

  if (!report) return <EmptyState title="Report not found." description="This report is not currently available in the session data." />;

  return (
    <div className="page-content">
      <PageHeader title="Report details" subtitle={report.file_name || 'Medical report'} />
      <section className="panel detail-panel">
        <div className="detail-list">
          <div><span>Report ID</span><strong>{report.id}</strong></div>
          <div><span>File name</span><strong>{report.file_name || 'Not provided'}</strong></div>
          <div><span>Type</span><strong>{report.file_type || 'Not provided'}</strong></div>
          <div><span>Status</span><strong>{report.analysis_status || 'pending'}</strong></div>
        </div>

        <div className="analysis-box">
          <h4>Analysis output</h4>
          <pre>{report.analysis_result ? JSON.stringify(report.analysis_result, null, 2) : 'No analysis has been returned yet.'}</pre>
        </div>
      </section>
    </div>
  );
}

function ImagesPage() {
  const { session } = useAuth();
  const { entries, addEntry, updateEntries } = useEntries();
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [status, setStatus] = React.useState('');

  async function handleUpload(e) {
    e.preventDefault();
    const patientId = localStorage.getItem(STORAGE_KEYS.patientId) || session.patientId || '';
    if (!patientId || !file) {
      setError('Create a patient profile and choose a PNG or JPEG image.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setStatus('Uploading image');
      const uploaded = await uploadImage({ patientId, file });
      addEntry('images', uploaded);
      setStatus('Running AI model');
      const analyzed = await analyzeImage(uploaded.id);
      const analyzedRecord = analyzed.record || { ...uploaded, analysis_result: analyzed.analysis, analysis_status: analyzed.status };
      updateEntries('images', (current) => [analyzedRecord, ...current.filter((item) => item.id !== uploaded.id)]);
      setStatus('Completed');
      setFile(null);
      e.target.reset();
    } catch (err) {
      setStatus('Failed');
      setError(err.message || 'X-ray analysis is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="Medical images" subtitle="Upload chest x-rays and review backend predictions." />
      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-head"><h3>Upload image</h3></div>
          <form onSubmit={handleUpload} className="form-stack">
            <label>
              <span>Patient ID</span>
              <input type="text" value={localStorage.getItem(STORAGE_KEYS.patientId) || ''} readOnly />
            </label>
            <label>
              <span>X-ray file</span>
              <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </label>
            {error && <div className="notice error">{error}</div>}
            {status && <div className="notice info">Status: {status}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><LoaderCircle className="spinner" size={16} /> Processing...</> : 'Upload and analyze'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Recent images</h3></div>
          {(entries.images || []).length ? (
            <div className="list-stack">
              {(entries.images || []).map((image) => (
                <div className="list-row" key={image.id}>
                  <div>
                    <strong>{image.file_name || 'Chest x-ray'}</strong>
                    <small>{image.analysis_status || 'pending'}</small>
                  </div>
                  <Link to={`/images/${image.id}`} className="muted-link">Open</Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No images uploaded yet." description="Upload an x-ray to trigger model inference." />
          )}
        </section>
      </div>
    </div>
  );
}

function ImageDetailPage() {
  const { id } = useParams();
  const { entries } = useEntries();
  const image = (entries.images || []).find((item) => item.id === id);

  if (!image) return <EmptyState title="Image not found." description="This image is not available in the current session." />;

  return (
    <div className="page-content">
      <PageHeader title="Image analysis" subtitle={image.file_name || 'Medical image'} />
      <section className="panel detail-panel">
        <div className="detail-list">
          <div><span>Image ID</span><strong>{image.id}</strong></div>
          <div><span>File name</span><strong>{image.file_name || 'Not provided'}</strong></div>
          <div><span>Status</span><strong>{image.analysis_status || 'pending'}</strong></div>
        </div>
        <div className="analysis-box">
          <h4>Prediction result</h4>
          <pre>{image.analysis_result ? JSON.stringify(image.analysis_result, null, 2) : 'No image analysis has been returned yet.'}</pre>
        </div>
      </section>
    </div>
  );
}

function CasesPage() {
  const { entries, addEntry } = useEntries();
  const [form, setForm] = React.useState({ patient_id: localStorage.getItem(STORAGE_KEYS.patientId) || '', symptoms: '', medical_history: '{}' });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const payload = {
        patient_id: form.patient_id,
        symptoms: form.symptoms ? form.symptoms.split(/\n|,/) : [],
        medical_history: JSON.parse(form.medical_history || '{}'),
      };
      const created = await createCase(payload);
      addEntry('cases', created);
      setForm({ ...form, symptoms: '', medical_history: '{}' });
    } catch (err) {
      setError(err.message || 'Unable to create the case.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="Cases" subtitle="Create care cases and review the backend’s multi-agent summary." />
      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-head"><h3>Create case</h3></div>
          <form onSubmit={handleCreate} className="form-stack">
            <label>
              <span>Patient ID</span>
              <input type="text" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required />
            </label>
            <label>
              <span>Symptoms</span>
              <textarea rows={4} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="Shortness of breath, fever, cough" />
            </label>
            <label>
              <span>Medical history JSON</span>
              <textarea rows={4} value={form.medical_history} onChange={(e) => setForm({ ...form, medical_history: e.target.value })} placeholder='{"diabetes": true}' />
            </label>
            {error && <div className="notice error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><LoaderCircle className="spinner" size={16} /> Creating...</> : 'Create case'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Recent cases</h3></div>
          {(entries.cases || []).length ? (
            <div className="list-stack">
              {(entries.cases || []).map((item) => (
                <div className="list-row" key={item.id}>
                  <div>
                    <strong>{item.status || 'New case'}</strong>
                    <small>{item.patient_id}</small>
                  </div>
                  <Link to={`/cases/${item.id}`} className="muted-link">Open</Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No cases created yet." description="Create the first care case to trigger the orchestrator." />
          )}
        </section>
      </div>
    </div>
  );
}

function CaseDetailPage() {
  const { id } = useParams();
  const [caseEntry, setCaseEntry] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    getCase(id)
      .then((record) => setCaseEntry(record))
      .catch((err) => setError(err.message || 'Unable to load case details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader title="Case details" />;
  if (error) return <div className="page-content"><PageHeader title="Case details" /><div className="notice error">{error}</div></div>;
  if (!caseEntry) return <EmptyState title="Case not found." description="The requested case does not exist in the current workspace." />;

  return (
    <div className="page-content">
      <PageHeader title="Case details" subtitle={`Case ${caseEntry.id}`} />
      <section className="panel detail-panel">
        <div className="detail-list">
          <div><span>Case ID</span><strong>{caseEntry.id}</strong></div>
          <div><span>Patient ID</span><strong>{caseEntry.patient_id}</strong></div>
          <div><span>Status</span><strong>{caseEntry.status || 'pending'}</strong></div>
          <div><span>Clinical summary</span><strong>{caseEntry.clinical_summary || 'Not yet generated'}</strong></div>
        </div>
      </section>
    </div>
  );
}

function AIAnalysisPage() {
  const { entries, addEntry } = useEntries();
  const [form, setForm] = React.useState({ patient_id: localStorage.getItem(STORAGE_KEYS.patientId) || '', symptoms: '', report_id: '', image_id: '' });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const response = await analyzeOrchestrator({
        patient_id: form.patient_id,
        symptoms: form.symptoms,
        report_id: form.report_id || null,
        image_id: form.image_id || null,
      });
      setResult(response);
      if (response.case_id) {
        const savedCase = await getCase(response.case_id);
        addEntry('cases', savedCase);
      }
    } catch (err) {
      setError(err.message || 'Unable to complete the analysis.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="AI-assisted clinical decision support" subtitle="Run the orchestrated workflow using the existing MAHIP backend." />
      <div className="two-column-grid">
        <section className="panel">
          <div className="panel-head"><h3>Run workflow</h3></div>
          <form onSubmit={handleSubmit} className="form-stack">
            <label>
              <span>Patient ID</span>
              <input type="text" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required />
            </label>
            <label>
              <span>Symptoms</span>
              <textarea rows={4} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="Describe the patient symptoms" required />
            </label>
            <label>
              <span>Report ID (optional)</span>
              <input type="text" value={form.report_id} onChange={(e) => setForm({ ...form, report_id: e.target.value })} placeholder="Use a report created in this session" />
            </label>
            <label>
              <span>Image ID (optional)</span>
              <input type="text" value={form.image_id} onChange={(e) => setForm({ ...form, image_id: e.target.value })} placeholder="Use an uploaded image" />
            </label>
            {error && <div className="notice error">{error}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? <><LoaderCircle className="spinner" size={16} /> Running analysis...</> : 'Analyze case'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Workflow output</h3></div>
          {result ? (
            <div className="analysis-box">
              <h4>AI-assisted clinical decision support</h4>
              <p className="soft-note">This information is AI-assisted decision support and is not a definitive medical diagnosis.</p>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          ) : (
            <EmptyState title="No workflow result yet." description="Run the orchestrator to unlock the patient, report, image, and diagnosis support flow." />
          )}
        </section>
      </div>
    </div>
  );
}

function KnowledgePage() {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await searchKnowledge(query, 5);
      setResults(response.results || response.documents || []);
    } catch (err) {
      setError(err.message || 'Unable to retrieve knowledge at this time.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="Knowledge assistant" subtitle="Ask a medical knowledge question using the MAHIP RAG agent." />
      <section className="panel">
        <form onSubmit={handleSearch} className="search-form">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask a medical knowledge question..." required />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <><LoaderCircle className="spinner" size={16} /> Searching...</> : 'Search'}
          </button>
        </form>

        {error && <div className="notice error">{error}</div>}

        {results.length ? (
          <div className="list-stack recommendation-list">
            {results.map((item, idx) => (
              <article className="result-card" key={`${item.source || 'result'}-${idx}`}>
                <div className="result-header">
                  <strong>{item.title || 'Relevant knowledge'}</strong>
                  <span className="tag">Relevance {item.score || item.relevance || 'n/a'}</span>
                </div>
                <p>{item.content || item.summary || item.text || 'No excerpt available.'}</p>
                <div className="meta-row">
                  <span>{item.source || 'Clinical knowledge'}</span>
                  <span>{item.clinical_note || 'Clinical note available'}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No search results yet." description="Ask a clinical question to retrieve context from the MAHIP knowledge base." />
        )}
      </section>
    </div>
  );
}

function AgentActivityPage() {
  const [caseId, setCaseId] = React.useState('');
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function loadLogs() {
    if (!caseId) {
      setError('Enter a case ID to inspect logs.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await getAgentLogs(caseId);
      setLogs(response || []);
    } catch (err) {
      setError(err.message || 'Unable to load agent activity.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="Agent monitoring" subtitle="Review agent execution logs for a case." />
      <section className="panel">
        <div className="search-form compact-form">
          <input type="text" value={caseId} onChange={(e) => setCaseId(e.target.value)} placeholder="Case ID" />
          <button className="btn btn-primary" type="button" onClick={loadLogs} disabled={loading}>
            {loading ? <><LoaderCircle className="spinner" size={16} /> Loading...</> : 'View logs'}
          </button>
        </div>

        {error && <div className="notice error">{error}</div>}

        {logs.length ? (
          <div className="list-stack">
            {logs.map((log) => (
              <div className="list-row log-row" key={log.id || `${log.case_id}-${log.agent_name}-${log.created_at}`}>
                <div>
                  <strong>{log.agent_name || 'Agent'}</strong>
                  <small>{log.case_id}</small>
                </div>
                <div className="log-meta">
                  <span className="tag">{log.status || 'success'}</span>
                  <span>{log.execution_time_ms || 0} ms</span>
                  <span>{log.created_at || 'Timestamp unavailable'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No agent logs yet." description="Run a case analysis to populate monitoring activity." />
        )}
      </section>
    </div>
  );
}

function SettingsPage() {
  const { session } = useAuth();
  return (
    <div className="page-content">
      <PageHeader title="Settings" subtitle="Session and application configuration." />
      <section className="panel detail-panel">
        <div className="detail-list">
          <div><span>User ID</span><strong>{session.userId || 'Not available'}</strong></div>
          <div><span>Role</span><strong>{session.role || 'patient'}</strong></div>
          <div><span>Access token</span><strong>{session.accessToken ? 'Present' : 'Not present'}</strong></div>
          <div><span>Refresh token</span><strong>{session.refreshToken ? 'Present' : 'Not present'}</strong></div>
        </div>
      </section>
    </div>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">MAHIP</p>
        <h2>{title}</h2>
      </div>
      {subtitle && <p className="muted-text">{subtitle}</p>}
    </header>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><CircleAlert size={20} /></div>
      <h4>{title}</h4>
      <p>{description}</p>
      {action && (
        <Link to={action.to} className="btn btn-primary">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function PageLoader({ title }) {
  return (
    <div className="page-content">
      <PageHeader title={title} subtitle="Loading data from the MAHIP backend." />
      <div className="loader-panel">
        <LoaderCircle className="spinner large" size={30} />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <EntriesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
            <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </EntriesProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
