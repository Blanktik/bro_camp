import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, MessageSquare, FileText } from 'lucide-react';

export default function StudentDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: Calendar, label: 'Events', path: '/student/events' },
    { icon: Users, label: 'Groups', path: '/student/groups' },
    { icon: MessageSquare, label: 'Anonymous Q&A', path: '/student/questions' },
    { icon: FileText, label: 'Submit Complaint', path: '/student/complaints' },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">CAMPUS</h1>
          <span className="text-xs text-gray-500 tracking-wider">STUDENT PORTAL</span>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
        >
          SIGN OUT
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="border border-gray-850 p-8 hover:border-white transition-colors text-left group"
              >
                <item.icon className="w-8 h-8 mb-4 text-gray-400 group-hover:text-white transition-colors" />
                <h3 className="text-xl font-bold tracking-tight">{item.label}</h3>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
