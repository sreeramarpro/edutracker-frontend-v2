import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthPage from './AuthPage'; // Make sure to import it!
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        {/* Replace your old Login component with the new AuthPage! */}
        <Route path="/" element={<AuthPage />} /> 
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;