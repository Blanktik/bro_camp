import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Shield } from 'lucide-react';
import { DashboardGuide } from '@/components/DashboardGuide';

const guideSteps = [
  {
    title: 'Welcome to Admin Dashboard',
    description: 'This is your central hub for managing the BROCAMP ecosystem. From here, you can access all administrative features and monitor the platform.',
    icon: <Shield className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'User Management',
    description: 'View all registered users, manage their roles (promote students to admins or demote them), and monitor user activity across the platform.',
    icon: <Users className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'Complaints',
    description: 'Review and respond to student complaints. You can use quick macros for common responses, add voice notes, and track complaint status.',
    icon: <FileText className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'Content Moderation',
    description: 'Flag inappropriate complaints, review flagged content, and permanently delete soft-deleted complaints. Keep the platform safe and clean.',
    icon: <Shield className="w-8 h-8 text-foreground" />,
  },
];

export default function AdminDashboard() {
  const { signOut, userRole } = useAuth();
  const navigate = useNavigate();

  const adminItems = [
    { icon: Users, label: 'User Management', path: '/admin/users' },
    { icon: FileText, label: 'Complaints', path: '/admin/complaints' },
    { icon: Shield, label: 'Moderation', path: '/admin/moderation' },
  ];

  return (
    <div className="min-h-screen animate-fade-in">
      <DashboardGuide
        steps={guideSteps}
        storageKey="brocamp-admin-guide-seen"
        dashboardName="Admin"
      />

      <header className="border-b border-border p-4 flex justify-between items-center animate-slide-in-left">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-foreground text-background px-2 inline-block hover:animate-glitch">BRO</span>CAMP
          </h1>
          <span className="text-xs text-muted-foreground tracking-wider">ADMIN CONTROL</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs border border-border px-3 py-1 tracking-wider">
            {userRole?.toUpperCase()}
          </span>
          <Button
            onClick={signOut}
            variant="outline"
            className="border-border text-muted-foreground hover:text-foreground hover:border-foreground hover-scale"
          >
            SIGN OUT
          </Button>
        </div>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 animate-fade-in-up animate-delay-200">
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Admin Dashboard</h2>
            <p className="text-muted-foreground text-sm">Manage BROCAMP ecosystem</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="border border-border p-8 hover:border-foreground transition-all duration-300 text-left group hover-scale animate-fade-in-up"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <item.icon className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
                <h3 className="text-lg font-bold tracking-tight">{item.label}</h3>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
