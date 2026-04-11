import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, BookOpen, GraduationCap } from 'lucide-react';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState([]); // Store live teachers here
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  
  const navigate = useNavigate();

  // Fetch the list of teachers as soon as the page loads
  useEffect(() => {
    fetch('http://localhost:8081/api/auth/teachers')
      .then(res => res.json())
      .then(data => setTeachers(data))
      .catch(err => console.error("Could not fetch teachers:", err));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Safety Check: Make sure a student actually picks a teacher!
    if (!isLogin && formData.role === 'student' && !selectedTeacherId) {
      toast.error('Please select an educator to join their class.');
      return;
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      const response = await fetch(`http://localhost:8081${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const userData = await response.json();
        
        if (isLogin) {
          localStorage.setItem('currentUser', JSON.stringify(userData));
          toast.success(`Welcome back, ${userData.name}!`);
          navigate(userData.role === 'teacher' ? '/teacher' : '/student');
        } else {
          // --- THE JOIN REQUEST MAGIC ---
          if (formData.role === 'student') {
            // If they signed up as a student, instantly fire off a join request!
            await fetch('http://localhost:8081/api/requests/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                studentId: userData.id,
                studentName: userData.name,
                studentEmail: userData.email,
                teacherId: Number(selectedTeacherId)
              })
            });
            toast.success('Account created! Join request sent to your educator.');
          } else {
            toast.success('Educator account created successfully!');
          }
          
          setIsLogin(true); 
          setFormData({ ...formData, password: '' }); 
        }
      } else {
        const errorText = await response.text();
        toast.error(errorText || 'Authentication failed.');
      }
    } catch (error) {
      toast.error('Cannot connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-main)', fontFamily: 'system-ui, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: '420px', padding: '40px', backgroundColor: 'var(--bg-card)', borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
            <BookOpen size={40} color="#6366f1" />
            <h1 style={{ margin: 0, fontSize: '32px', color: 'var(--text-main)', letterSpacing: '1px' }}>Edu<span style={{ color: '#6366f1' }}>Tracker</span></h1>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>{isLogin ? 'Sign in to access your dashboard' : 'Create your account to get started'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input required={!isLogin} type="text" name="name" placeholder="John Doe" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', boxSizing: 'border-box' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input required type="email" name="email" placeholder="you@school.edu" value={formData.email} onChange={handleInputChange} style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input required type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>I am a...</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setFormData({...formData, role: 'student'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${formData.role === 'student' ? '#6366f1' : 'var(--border)'}`, backgroundColor: formData.role === 'student' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-main)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Student</button>
                  <button type="button" onClick={() => setFormData({...formData, role: 'teacher'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${formData.role === 'teacher' ? '#6366f1' : 'var(--border)'}`, backgroundColor: formData.role === 'teacher' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-main)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>Educator</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* THE NEW TEACHER DROPDOWN */}
          <AnimatePresence mode="popLayout">
            {!isLogin && formData.role === 'student' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px', marginTop: '10px' }}>Select Your Educator</label>
                <div style={{ position: 'relative' }}>
                  <GraduationCap size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} style={{ width: '100%', padding: '10px 10px 10px 40px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '8px', boxSizing: 'border-box', appearance: 'none' }}>
                    <option value="">Choose a teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button disabled={isLoading} type="submit" style={{ width: '100%', padding: '14px', marginTop: '10px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'background-color 0.2s', opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', padding: 0, fontSize: '14px' }}>
              {isLogin ? 'Sign up here' : 'Log in here'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default AuthPage;