import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import Sidebar from './Sidebar';
import toast from 'react-hot-toast'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, FileText, CheckCircle } from 'lucide-react';

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [myGrades, setMyGrades] = useState([]);
  const [overallAvg, setOverallAvg] = useState(0);
  const [radarData, setRadarData] = useState([]);
  const [weakestSubject, setWeakestSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) { navigate('/'); return; }
    
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'student') { navigate('/teacher'); return; }
    
    setStudent(parsedUser);

    const grades = results.filter(r => r.studentId === parsedUser.id).map(result => {
      const testInfo = assessments.find(a => a.id === result.assessmentId);
      return { 
        testName: testInfo ? testInfo.title : 'Unknown', 
        subject: testInfo ? testInfo.subject : 'Misc',
        percentage: testInfo ? Math.round((result.score / testInfo.maxScore) * 100) : 0, 
        score: result.score, 
        maxScore: testInfo ? testInfo.maxScore : 100, 
        feedback: result.feedback,
        date: testInfo ? testInfo.date : 'N/A'
      };
    });

    setMyGrades(grades);

    if (grades.length > 0) {
      const total = grades.reduce((sum, g) => sum + g.percentage, 0);
      setOverallAvg((total / grades.length).toFixed(1));

      const subjectMap = {};
      grades.forEach(g => {
        if (!subjectMap[g.subject]) subjectMap[g.subject] = { total: 0, count: 0 };
        subjectMap[g.subject].total += g.percentage;
        subjectMap[g.subject].count += 1;
      });

      const processedRadar = Object.keys(subjectMap).map(sub => ({
        subject: sub,
        score: Math.round(subjectMap[sub].total / subjectMap[sub].count)
      }));

      setRadarData(processedRadar);

      if (processedRadar.length > 0) {
        const sortedSubjects = [...processedRadar].sort((a, b) => a.score - b.score);
        if (sortedSubjects[0].score < 70) {
          setWeakestSubject(sortedSubjects[0].subject);
        }
      }
    }
  }, [navigate]);

  const handleLogout = () => { 
    localStorage.removeItem('currentUser'); 
    toast.success('Logged out successfully!'); 
    navigate('/'); 
  };

  if (!student) return null;

  const PageWrapper = ({ children, keyName }) => (
    <motion.div key={keyName} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );

  const renderDashboard = () => (
    <PageWrapper keyName="dashboard">
      <div style={{ marginBottom: '30px' }}>
        <h1 className="gradient-text" style={{ margin: 0 }}>Student Portal</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Welcome back, {student.name}</p>
      </div>
      
      {weakestSubject && (
        <div style={{ backgroundColor: 'rgba(250, 173, 20, 0.1)', borderLeft: '5px solid #faad14', padding: '15px 20px', borderRadius: '4px', marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
          <Lightbulb size={24} color="#d48806" style={{ marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 5px 0', color: '#d48806' }}>Area for Improvement Identified</h4>
            <p style={{ margin: 0, color: 'var(--text-main)' }}>Your current performance in <strong>{weakestSubject}</strong> is lower than your other subjects. Consider reviewing recent feedback and dedicating extra study time here.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Overall Average</h4>
          <h2 style={{ margin: 0, fontSize: '36px', color: overallAvg >= 70 ? '#52c41a' : '#f5222d' }}>{overallAvg}%</h2>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Assessments Completed</h4>
          <h2 style={{ margin: 0, fontSize: '36px', color: '#6366f1' }}>{myGrades.length}</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 500px', backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Progress Over Time</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={[...myGrades].reverse()}>
                <defs>
                  <linearGradient id="colorStudent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="testName" tick={{ fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                <Area type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStudent)" activeDot={{ r: 8 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div style={{ flex: '1 1 300px', backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Subject Mastery</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                <Radar name="Mastery" dataKey="score" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </PageWrapper>
  );

  const renderAssessments = () => (
    <PageWrapper keyName="assessments">
      <div style={{ marginBottom: '30px' }}>
        <h1 className="gradient-text" style={{ margin: 0 }}>My Assessments</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Review your past grades and educator feedback.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {myGrades.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No assessments recorded yet.</p>
        ) : (
          [...myGrades].reverse().map((grade, index) => (
            <div key={index} style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <FileText size={20} color="#6366f1" />
                  <h3 style={{ margin: 0, color: 'var(--text-main)' }}>{grade.testName}</h3>
                  <span style={{ padding: '2px 8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>{grade.subject}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Date: {grade.date}</p>
                {grade.feedback && (
                  <p style={{ margin: '10px 0 0 0', padding: '10px', backgroundColor: 'var(--bg-main)', borderLeft: '3px solid #6366f1', borderRadius: '0 4px 4px 0', color: 'var(--text-main)', fontSize: '14px', fontStyle: 'italic' }}>
                    "{grade.feedback}"
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ margin: 0, color: grade.percentage >= 70 ? '#52c41a' : '#f5222d', fontSize: '28px' }}>{grade.score} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {grade.maxScore}</span></h2>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: grade.percentage >= 70 ? '#52c41a' : '#f5222d' }}>{grade.percentage}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </PageWrapper>
  );

  const renderSettings = () => (
    <PageWrapper keyName="settings">
      <div style={{ marginBottom: '30px' }}>
        <h1 className="gradient-text" style={{ margin: 0 }}>Account Settings</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage your profile and preferences.</p>
      </div>
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', maxWidth: '500px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Full Name</label>
          <input type="text" disabled value={student.name} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Email Address</label>
          <input type="email" disabled value={student.email} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} />
        </div>
        <button onClick={() => toast('Settings updating feature coming soon!')} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Change Password</button>
      </div>
    </PageWrapper>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <Sidebar role={student.role} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'assessments' && renderAssessments()}
            {activeTab === 'settings' && renderSettings()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;