import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function StudentDashboard() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: FileText, label: 'Submit Complaint', path: '/student/complaints' },
  ];

  return (
    <div className="min-h-screen animate-fade-in">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center animate-slide-in-left">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-white text-black px-2 inline-block hover:animate-glitch">BRO</span>CAMP
          </h1>
          <span className="text-xs text-gray-500 tracking-wider">
            {userRole === 'super_admin' ? 'SUPER ADMIN' : userRole === 'admin' ? 'ADMIN' : 'STUDENT PORTAL'}
          </span>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="border-gray-850 text-gray-400 hover:text-white hover:border-white hover-scale"
        >
          SIGN OUT
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 animate-fade-in-up animate-delay-200">
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="border border-gray-850 p-8 hover:border-white transition-all duration-300 text-left group hover-scale animate-fade-in-up"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <item.icon className="w-8 h-8 mb-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                <h3 className="text-xl font-bold tracking-tight">{item.label}</h3>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
