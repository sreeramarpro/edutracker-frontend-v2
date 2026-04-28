import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Sidebar from './Sidebar';
import toast from 'react-hot-toast'; 
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Download, FileText, X, UserPlus, Bell, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const BASE_URL = 'http://localhost:8081';

function TeacherDashboard() {
  const [liveStudents, setLiveStudents] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [studentStats, setStudentStats] = useState([]);
  const [classAverage, setClassAverage] = useState(0);
  const [atRiskCount, setAtRiskCount] = useState(0);
  
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  
  const [assessmentList, setAssessmentList] = useState([]);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);

  // MCQ builder state
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState({});

  const [pendingRequests, setPendingRequests] = useState([]);
  
  const [newGrade, setNewGrade] = useState({ studentId: '', assessmentId: '', score: '', feedback: '' });
  const [newAssessment, setNewAssessment] = useState({ title: '', subject: '', maxScore: '100', date: new Date().toISOString().split('T')[0] });
  const [newStudent, setNewStudent] = useState({ name: '', email: '' });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const navigate = useNavigate();

  // Empty question template
  const emptyQuestion = () => ({
    _key: Math.random(),
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A'
  });

  // Fetch teacher-scoped assessments only
  const fetchAssessments = async (teacherId) => {
    const id = teacherId || teacher?.id;
    if (!id) return;
    try {
      const response = await fetch(`${BASE_URL}/api/assessments/teacher/${id}`);
      const data = await response.json();
      setAssessmentList(data);
    } catch (error) {
      console.error("Could not fetch assessments:", error);
    }
  };

  const fetchLiveStudents = async (tId) => {
    const idToUse = tId || teacher?.id;
    if (!idToUse) return;
    try {
      const response = await fetch(`${BASE_URL}/api/requests/approved/${idToUse}`);
      const data = await response.json();
      const roster = data.map(req => ({
        id: req.studentId || req.id,
        name: req.studentName,
        email: req.studentEmail,
        role: 'student'
      }));
      setLiveStudents(roster);
    } catch (error) {
      console.error("Database connection failed:", error);
    }
  };

  const fetchPendingRequests = async (teacherId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/requests/pending/${teacherId}`);
      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      console.error("Could not fetch lobby:", error);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const response = await fetch(`${BASE_URL}/api/requests/${requestId}/approve`, { method: 'PUT' });
      if (response.ok) {
        toast.success('Student approved!');
        fetchPendingRequests(teacher.id);
        fetchLiveStudents(teacher.id);
      }
    } catch (error) {
      toast.error('Approval failed.');
    }
  };

  const seedDatabase = async () => {
    const studentsOnly = users.filter(u => u.role === 'student');
    let addedCount = 0;
    for (const student of studentsOnly) {
      const alreadyExists = liveStudents.some(liveStudent => liveStudent.email === student.email);
      if (!alreadyExists) {
        await fetch(`${BASE_URL}/api/requests/direct-add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            studentName: student.name, 
            studentEmail: student.email, 
            teacherId: teacher.id,
            studentId: Math.floor(Math.random() * 10000)
          })
        });
        addedCount++;
      }
    }
    if (addedCount > 0) {
      toast.success(`🌱 Successfully added ${addedCount} new students!`);
      fetchLiveStudents(teacher.id);
    } else {
      toast('✨ Database is already fully seeded!', { icon: '🛑' });
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (liveStudents.some(s => s.email === newStudent.email)) {
      toast.error('A student with this email is already in your class!');
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/api/requests/direct-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentName: newStudent.name, 
          studentEmail: newStudent.email, 
          teacherId: teacher.id,
          studentId: Math.floor(Math.random() * 10000)
        })
      });
      if (response.ok) {
        toast.success(`${newStudent.name} added to roster!`);
        setIsAddStudentModalOpen(false);
        setNewStudent({ name: '', email: '' });
        fetchLiveStudents(teacher.id); 
      } else {
        toast.error('Failed to save student.');
      }
    } catch (error) {
      toast.error('Cannot connect to server.');
    }
  };

  const calculateStats = (currentResults = results) => {
    const allStudents = liveStudents;
    let totalClassPercentage = 0;
    let riskCount = 0;
    
    const stats = allStudents.map(student => {
      const studentGrades = currentResults.filter(r => r.studentId === student.id);
      let totalPercentage = 0;
      studentGrades.forEach(grade => {
        const testInfo = assessmentList.find(a => a.id === grade.assessmentId);
        if (testInfo) {
          totalPercentage += (grade.score / testInfo.maxScore) * 100;
        }
      });
      const average = studentGrades.length > 0 ? (totalPercentage / studentGrades.length).toFixed(1) : 0;
      const numAvg = parseFloat(average);
      totalClassPercentage += numAvg;
      if (numAvg < 70) riskCount++;
      return { id: student.id, name: student.name, email: student.email, average: numAvg };
    });
    setStudentStats(stats);
    if (stats.length > 0) setClassAverage((totalClassPercentage / stats.length).toFixed(1));
    setAtRiskCount(riskCount);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (!storedUser) { navigate('/'); return; }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'teacher') { navigate('/student'); return; }
    setTeacher(parsedUser);
    
    fetchLiveStudents(parsedUser.id);
    fetchPendingRequests(parsedUser.id);
    fetchAssessments(parsedUser.id);
  }, [navigate]); 

  useEffect(() => {
    if (liveStudents.length > 0) {
      calculateStats();
    } else {
      setStudentStats([]);
      setClassAverage(0);
      setAtRiskCount(0);
    }
  }, [liveStudents, assessmentList, results]);

  const handleLogout = () => { 
    localStorage.removeItem('currentUser'); 
    toast.success('Logged out successfully!'); 
    navigate('/'); 
  };

  // --- Create assignment with MCQ questions ---
  const handleAddAssessment = async (e) => {
    e.preventDefault();

    if (mcqQuestions.length === 0) {
      toast.error('Please add at least one MCQ question.');
      return;
    }
    // Validate questions
    for (let i = 0; i < mcqQuestions.length; i++) {
      const q = mcqQuestions[i];
      if (!q.questionText || !q.optionA || !q.optionB || !q.optionC || !q.optionD) {
        toast.error(`Question ${i + 1} is incomplete. Fill in all fields.`);
        return;
      }
    }
    
    try {
      // Step 1: Save the assessment (maxScore = number of questions)
      const assessmentRes = await fetch(`${BASE_URL}/api/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAssessment.title,
          subject: newAssessment.subject,
          maxScore: mcqQuestions.length,
          date: newAssessment.date,
          teacherId: teacher.id
        })
      });

      if (!assessmentRes.ok) {
        toast.error('Failed to create assignment.');
        return;
      }

      const savedAssessment = await assessmentRes.json();

      // Step 2: Save all MCQ questions linked to this assessment
      const questionsRes = await fetch(`${BASE_URL}/api/assessments/${savedAssessment.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcqQuestions.map(({ _key, ...q }) => q))
      });

      if (questionsRes.ok) {
        toast.success(`✅ Assignment "${newAssessment.title}" created with ${mcqQuestions.length} questions!`);
        setIsAssessmentModalOpen(false);
        setNewAssessment({ title: '', subject: '', maxScore: '100', date: new Date().toISOString().split('T')[0] });
        setMcqQuestions([]);
        fetchAssessments(teacher.id); 
      } else {
        toast.error('Assignment saved but questions failed. Try again.');
      }
    } catch (error) {
      toast.error('Cannot connect to server.');
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment and all its questions?")) return;
    try {
      const response = await fetch(`${BASE_URL}/api/assessments/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Assignment deleted!');
        fetchAssessments(teacher.id);
      } else {
        toast.error('Failed to delete assignment.');
      }
    } catch (error) {
      toast.error('Cannot connect to server.');
    }
  };

  const handleViewQuestions = async (assessmentId) => {
    if (expandedAssessmentId === assessmentId) {
      setExpandedAssessmentId(null);
      return;
    }
    setExpandedAssessmentId(assessmentId);
    if (assessmentQuestions[assessmentId]) return; // already fetched
    try {
      const res = await fetch(`${BASE_URL}/api/assessments/${assessmentId}/questions`);
      const data = await res.json();
      setAssessmentQuestions(prev => ({ ...prev, [assessmentId]: data }));
    } catch (e) {
      toast.error('Could not load questions.');
    }
  };

  const handleAddGrade = (e) => {
    e.preventDefault();
    const newResult = {
      id: Math.floor(Math.random() * 10000),
      studentId: Number(newGrade.studentId),
      assessmentId: Number(newGrade.assessmentId),
      score: Number(newGrade.score),
      feedback: newGrade.feedback || "Reviewed offline."
    };
    setResults(prev => [...prev, newResult]);
    setIsGradeModalOpen(false);
    setNewGrade({ studentId: '', assessmentId: '', score: '', feedback: '' });
    toast.success('Grade & remark saved successfully!'); 
  };

  const generateReport = () => {
    const headers = ['Student Name,Overall Average (%),Status'];
    const rows = studentStats.map(stat => `${stat.name},${stat.average},${stat.average >= 70 ? 'On Track' : 'Needs Support'}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "class_performance_report.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success('Report downloaded!');
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedStudents = [...studentStats]
    .filter(student => student.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  let selectedStudent = null;
  let selectedStudentGrades = [];
  if (selectedStudentId) {
    selectedStudent = liveStudents.find(u => u.id === selectedStudentId);
    selectedStudentGrades = results.filter(r => r.studentId === selectedStudentId).map(result => {
      const testInfo = assessmentList.find(a => a.id === result.assessmentId);
      return { 
        testName: testInfo ? testInfo.title : 'Unknown', 
        percentage: testInfo ? Math.round((result.score / testInfo.maxScore) * 100) : 0, 
        score: result.score, 
        maxScore: testInfo ? testInfo.maxScore : 100, 
        feedback: result.feedback 
      };
    });
  }

  if (!teacher) return null;

  const PageWrapper = ({ children, keyName }) => (
    <motion.div key={keyName} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );

  // --- MCQ Question builder helpers ---
  const addQuestion = () => setMcqQuestions(prev => [...prev, emptyQuestion()]);
  const removeQuestion = (key) => setMcqQuestions(prev => prev.filter(q => q._key !== key));
  const updateQuestion = (key, field, value) => {
    setMcqQuestions(prev => prev.map(q => q._key === key ? { ...q, [field]: value } : q));
  };

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', boxSizing: 'border-box', fontSize: '13px' };
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px' };

  // --- RENDER SECTIONS ---
  const renderDashboard = () => (
    <PageWrapper keyName="dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 className="gradient-text" style={{ margin: 0 }}>Educator Portal</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Logged in as {teacher.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsLobbyOpen(true)} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>
            <Bell size={20} color="var(--text-main)" />
            {pendingRequests.length > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#f5222d', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button onClick={seedDatabase} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            🌱 Seed Database
          </button>
          <button onClick={() => setIsAddStudentModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#14b8a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <UserPlus size={18} /> Add Student
          </button>
          <button onClick={() => setIsGradeModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            <Plus size={18} /> Grade Student
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}><h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Total Students</h4><h2 style={{ margin: 0, fontSize: '36px', color: '#6366f1' }}>{studentStats.length}</h2></div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}><h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Class Average</h4><h2 style={{ margin: 0, fontSize: '36px', color: classAverage >= 70 ? '#52c41a' : '#faad14' }}>{classAverage}%</h2></div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}><h4 style={{ margin: '0 0 10px 0', color: 'var(--text-muted)' }}>Students at Risk</h4><h2 style={{ margin: 0, fontSize: '36px', color: atRiskCount > 0 ? '#f5222d' : '#52c41a' }}>{atRiskCount}</h2></div>
      </div>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Performance Overview</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={studentStats}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)' }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
              <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)' }} />
              <Bar dataKey="average" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Student Roster</h3>
          <input type="text" placeholder="Search students..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', width: '250px' }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
              <th onClick={() => handleSort('name')} style={{ padding: '16px', textAlign: 'left', cursor: 'pointer', color: 'var(--text-muted)' }}>Student Name {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('average')} style={{ padding: '16px', textAlign: 'left', cursor: 'pointer', color: 'var(--text-muted)' }}>Overall Average {sortConfig.key === 'average' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
              <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-muted)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {processedStudents.map((stat, index) => (
              <tr key={index} onClick={() => setSelectedStudentId(stat.id)} style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                <td style={{ padding: '16px', color: '#6366f1', fontWeight: 'bold' }}>{stat.name}</td>
                <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{stat.average}%</td>
                <td style={{ padding: '16px' }}><span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: stat.average >= 70 ? 'rgba(82, 196, 26, 0.1)' : 'rgba(245, 34, 45, 0.1)', color: stat.average >= 70 ? '#52c41a' : '#f5222d' }}>{stat.average >= 70 ? 'On Track' : 'Needs Support'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );

  const renderAssessments = () => (
    <PageWrapper keyName="assessments">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 className="gradient-text" style={{ margin: 0 }}>Assignments Manager</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Create MCQ assignments visible to your enrolled students.</p>
        </div>
        <button onClick={() => { setMcqQuestions([emptyQuestion()]); setIsAssessmentModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          <Plus size={18} /> New Assignment
        </button>
      </div>
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        {assessmentList.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>No assignments created yet. Click "New Assignment" to get started.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {assessmentList.map(a => (
              <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Assignment row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', backgroundColor: 'var(--bg-main)' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)', marginRight: '12px' }}>{a.title}</span>
                    <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: '10px', marginRight: '8px' }}>{a.subject}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.maxScore} questions · {a.date}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleViewQuestions(a.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      {expandedAssessmentId === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expandedAssessmentId === a.id ? 'Hide' : 'View'} Questions
                    </button>
                    <button
                      onClick={() => handleDeleteAssessment(a.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#f5222d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
                {/* Expandable questions view */}
                {expandedAssessmentId === a.id && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
                    {!assessmentQuestions[a.id] ? (
                      <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading...</p>
                    ) : assessmentQuestions[a.id].length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', margin: 0 }}>No questions found for this assignment.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {assessmentQuestions[a.id].map((q, i) => (
                          <div key={q.id} style={{ padding: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: 'var(--text-main)' }}>Q{i+1}. {q.questionText}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              {['A', 'B', 'C', 'D'].map(opt => (
                                <div key={opt} style={{ padding: '6px 10px', borderRadius: '4px', fontSize: '13px', backgroundColor: q.correctOption === opt ? 'rgba(82,196,26,0.15)' : 'transparent', border: `1px solid ${q.correctOption === opt ? '#52c41a' : 'var(--border)'}`, color: q.correctOption === opt ? '#52c41a' : 'var(--text-muted)', fontWeight: q.correctOption === opt ? '600' : '400' }}>
                                  {opt}. {q[`option${opt}`]}
                                  {q.correctOption === opt && ' ✓'}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );

  const renderReports = () => (
    <PageWrapper keyName="reports">
      <div style={{ marginBottom: '30px' }}><h1 className="gradient-text" style={{ margin: 0 }}>Analytics & Reports</h1><p style={{ margin: 0, color: 'var(--text-muted)' }}>Generate data exports for administrative review.</p></div>
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ marginBottom: '20px', color: '#6366f1' }}><FileText size={48} /></div>
        <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-main)' }}>Class Performance Export</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', marginBottom: '20px' }}>Download a complete CSV file containing all current student averages and tracking statuses.</p>
        <button onClick={generateReport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
          <Download size={18} /> Download CSV Report
        </button>
      </div>
    </PageWrapper>
  );

  const renderSettings = () => (
    <PageWrapper keyName="settings">
      <div style={{ marginBottom: '30px' }}><h1 className="gradient-text" style={{ margin: 0 }}>Account Settings</h1><p style={{ margin: 0, color: 'var(--text-muted)' }}>Manage your profile and preferences.</p></div>
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '10px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', maxWidth: '500px' }}>
        <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Full Name</label><input type="text" disabled value={teacher.name} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} /></div>
        <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-main)' }}>Email Address</label><input type="email" disabled value={teacher.email} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '6px' }} /></div>
        <button onClick={() => toast('Settings updating feature coming soon!')} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: '#6366f1', border: '1px solid #6366f1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Change Password</button>
      </div>
    </PageWrapper>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
      <Sidebar role={teacher.role} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', height: '100vh', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'assessments' && renderAssessments()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'settings' && renderSettings()}
          </AnimatePresence>
        </div>
      </div>

      {/* MODALS */}

      {/* Add Student Modal */}
      <AnimatePresence>
        {isAddStudentModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Add New Student</h2>
                <button type="button" onClick={() => setIsAddStudentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div><label style={labelStyle}>Student Name</label><input required type="text" placeholder="e.g., Sarah Jenkins" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Student Email</label><input required type="email" placeholder="sarah@school.edu" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} style={inputStyle} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}><button type="button" onClick={() => setIsAddStudentModalOpen(false)} style={{ padding: '10px 15px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ padding: '10px 15px', backgroundColor: '#14b8a6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Add Student</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade Student Modal */}
      <AnimatePresence>
        {isGradeModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Grade Student</h2>
                <button type="button" onClick={() => setIsGradeModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddGrade} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={labelStyle}>Select Assignment</label>
                  <select required value={newGrade.assessmentId} onChange={e => setNewGrade({...newGrade, assessmentId: e.target.value})} style={inputStyle}>
                    <option value="">Choose an assignment...</option>
                    {assessmentList.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} pts)</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Select Student</label>
                  <select required value={newGrade.studentId} onChange={e => setNewGrade({...newGrade, studentId: e.target.value})} style={inputStyle}>
                    <option value="">Choose a student...</option>
                    {liveStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Score Achieved</label><input required type="number" value={newGrade.score} onChange={e => setNewGrade({...newGrade, score: e.target.value})} style={inputStyle} /></div>
                <div><label style={labelStyle}>Educator Remarks</label><textarea required rows="3" placeholder="e.g., Great work on the logic section." value={newGrade.feedback} onChange={e => setNewGrade({...newGrade, feedback: e.target.value})} style={{ ...inputStyle, resize: 'vertical' }} /></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}><button type="button" onClick={() => setIsGradeModalOpen(false)} style={{ padding: '10px 15px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button><button type="submit" style={{ padding: '10px 15px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save Grade</button></div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ NEW: Create MCQ Assignment Modal */}
      <AnimatePresence>
        {isAssessmentModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px', boxSizing: 'border-box' }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>Create MCQ Assignment</h2>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>All enrolled students will see and can attempt this quiz.</p>
                </div>
                <button type="button" onClick={() => setIsAssessmentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>

              <form onSubmit={handleAddAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Basic Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={labelStyle}>Assignment Title</label>
                    <input required type="text" placeholder="e.g., Chapter 3 Quiz" value={newAssessment.title} onChange={e => setNewAssessment({...newAssessment, title: e.target.value})} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Subject Domain</label>
                    <input required type="text" placeholder="e.g., Mathematics" value={newAssessment.subject} onChange={e => setNewAssessment({...newAssessment, subject: e.target.value})} style={inputStyle} />
                  </div>
                </div>

                {/* MCQ Questions */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '15px' }}>Questions ({mcqQuestions.length})</h3>
                    <button type="button" onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid #6366f1', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                      <Plus size={14} /> Add Question
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {mcqQuestions.map((q, i) => (
                      <div key={q._key} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontWeight: '700', color: '#6366f1', fontSize: '13px' }}>Question {i + 1}</span>
                          {mcqQuestions.length > 1 && (
                            <button type="button" onClick={() => removeQuestion(q._key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f5222d', padding: '2px' }}>
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={labelStyle}>Question Text</label>
                          <input required type="text" placeholder="e.g., What is the capital of France?" value={q.questionText} onChange={e => updateQuestion(q._key, 'questionText', e.target.value)} style={inputStyle} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                          {['A', 'B', 'C', 'D'].map(opt => (
                            <div key={opt}>
                              <label style={labelStyle}>Option {opt}</label>
                              <input required type="text" placeholder={`Option ${opt}`} value={q[`option${opt}`]} onChange={e => updateQuestion(q._key, `option${opt}`, e.target.value)} style={{ ...inputStyle, borderColor: q.correctOption === opt ? '#52c41a' : 'var(--border)' }} />
                            </div>
                          ))}
                        </div>

                        <div>
                          <label style={labelStyle}>Correct Answer</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {['A', 'B', 'C', 'D'].map(opt => (
                              <button key={opt} type="button" onClick={() => updateQuestion(q._key, 'correctOption', opt)}
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', border: `2px solid ${q.correctOption === opt ? '#52c41a' : 'var(--border)'}`, backgroundColor: q.correctOption === opt ? 'rgba(82,196,26,0.15)' : 'transparent', color: q.correctOption === opt ? '#52c41a' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setIsAssessmentModalOpen(false)} style={{ padding: '10px 20px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#a855f7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    Publish Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Profile Modal */}
      <AnimatePresence>
        {selectedStudentId && selectedStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <motion.div initial={{ y: 50, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 50, scale: 0.9, opacity: 0 }} style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-light)', paddingBottom: '15px', marginBottom: '20px' }}>
                <div><h2 style={{ margin: '0 0 5px 0', color: 'var(--text-main)' }}>{selectedStudent.name}'s Profile</h2><span style={{ color: 'var(--text-muted)' }}>{selectedStudent.email}</span></div>
                <button onClick={() => setSelectedStudentId(null)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}><X size={16} /> Close</button>
              </div>
              <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Progress Timeline</h3>
              <div style={{ width: '100%', height: 250, backgroundColor: 'var(--bg-main)', borderRadius: '8px', padding: '10px', marginBottom: '20px' }}>
                <ResponsiveContainer>
                  <AreaChart data={selectedStudentGrades}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="testName" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                    <Area type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{ r: 8 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <h3 style={{ marginTop: 0, color: 'var(--text-main)' }}>Assessment History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedStudentGrades.map((grade, index) => (
                  <div key={index} style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', padding: '12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><h4 style={{ margin: '0 0 4px 0', color: 'var(--text-main)' }}>{grade.testName}</h4><span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{grade.feedback}"</span></div>
                    <strong style={{ color: grade.percentage >= 70 ? '#52c41a' : '#f5222d', fontSize: '18px' }}>{grade.score} / {grade.maxScore}</strong>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lobby / Waiting Room Modal */}
      <AnimatePresence>
        {isLobbyOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} style={{ backgroundColor: 'var(--bg-card)', padding: '30px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Waiting Room</h2>
                <button onClick={() => setIsLobbyOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              {pendingRequests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No pending join requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: 'var(--text-main)' }}>{req.studentName}</h4>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{req.studentEmail}</span>
                      </div>
                      <button onClick={() => handleApproveRequest(req.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 16px', backgroundColor: '#52c41a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        <Check size={16} /> Approve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TeacherDashboard;