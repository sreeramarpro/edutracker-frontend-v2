import { LayoutDashboard, FileText, BarChart2, Settings, LogOut, BookOpen } from 'lucide-react';

function Sidebar({ role, onLogout, activeTab, setActiveTab }) {
  const menuItems = role === 'teacher' 
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'assessments', label: 'Assessments', icon: <FileText size={20} /> },
        { id: 'reports', label: 'Reports', icon: <BarChart2 size={20} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
      ]
    : [
        { id: 'dashboard', label: 'My Progress', icon: <LayoutDashboard size={20} /> },
        { id: 'assessments', label: 'My Assessments', icon: <FileText size={20} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={20} /> }
      ];

  return (
    <div style={{ width: '250px', backgroundColor: 'var(--sidebar-bg)', color: 'white', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      <div style={{ padding: '30px 20px', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <BookOpen size={28} color="#6366f1" />
        <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>Edu<span style={{ color: '#6366f1' }}>Tracker</span></h2>
      </div>
      <nav style={{ flex: 1, padding: '20px 0' }}>
        {menuItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => setActiveTab(item.id)}
            style={{ 
              padding: '15px 25px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              backgroundColor: activeTab === item.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === item.id ? '#6366f1' : '#94a3b8',
              borderRight: activeTab === item.id ? '4px solid #6366f1' : '4px solid transparent',
              transition: 'all 0.2s ease',
              fontWeight: activeTab === item.id ? 'bold' : 'normal'
            }}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>
      <div style={{ padding: '20px', borderTop: '1px solid var(--sidebar-border)' }}>
        <button onClick={onLogout} style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: 'transparent', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s ease' }}>
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;