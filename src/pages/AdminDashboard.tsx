import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, FileText, Shield, BarChart } from 'lucide-react';

export default function AdminDashboard() {
  const { signOut, userRole } = useAuth();
  const navigate = useNavigate();

  const adminItems = [
    { icon: Users, label: 'User Management', path: '/admin/users' },
    { icon: Calendar, label: 'Events', path: '/admin/events' },
    { icon: FileText, label: 'Complaints', path: '/admin/complaints' },
    { icon: Shield, label: 'Moderation', path: '/admin/moderation' },
    { icon: BarChart, label: 'Analytics', path: '/admin/analytics' },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-white text-black px-2">BRO</span>CAMPUS
          </h1>
          <span className="text-xs text-gray-500 tracking-wider">ADMIN CONTROL</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs border border-gray-850 px-3 py-1 tracking-wider">
            {userRole?.toUpperCase()}
          </span>
          <Button
            onClick={signOut}
            variant="outline"
            className="border-gray-850 text-gray-400 hover:text-white hover:border-white"
          >
            SIGN OUT
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Admin Dashboard</h2>
            <p className="text-gray-400 text-sm">Manage campus ecosystem</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="border border-gray-850 p-8 hover:border-white transition-colors text-left group"
              >
                <item.icon className="w-8 h-8 mb-4 text-gray-400 group-hover:text-white transition-colors" />
                <h3 className="text-lg font-bold tracking-tight">{item.label}</h3>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
