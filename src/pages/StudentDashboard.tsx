import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { FileText, User, MessageSquare, Mic } from 'lucide-react';
import ElevenLabsWidget from '@/components/ElevenLabsWidget';
import { DashboardGuide } from '@/components/DashboardGuide';

const guideSteps = [
  {
    title: 'Welcome to BROCAMP',
    description: 'This is your student portal where you can submit complaints, manage your profile, and communicate with administrators. Let\'s walk you through everything!',
    icon: <MessageSquare className="w-8 h-8 text-foreground" />,
  },
  {
    title: 'Submit Complaint',
    description: 'Have an issue? Click here to submit a complaint. You can write text, attach images/videos, or record a voice note. Submit anonymously if you prefer privacy.',
    icon: <FileText className="w-8 h-8 text-foreground" />,
    selector: '[data-guide="complaint-card"]',
  },
  {
    title: 'My Profile',
    description: 'Update your personal information including name, bio, department, year, social links, and profile picture. Keep your profile up to date!',
    icon: <User className="w-8 h-8 text-foreground" />,
    selector: '[data-guide="profile-card"]',
  },
  {
    title: 'Voice Assistant',
    description: 'See this floating button? That\'s our AI voice assistant. Click it to speak your complaints directly - it will automatically submit them for you!',
    icon: <Mic className="w-8 h-8 text-foreground" />,
    selector: '[data-guide="voice-widget"]',
  },
];

const VOICE_ASSISTANT_STEP = 3; // Index of the voice assistant step

export default function StudentDashboard() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [guideState, setGuideState] = useState({ isShowing: false, currentStep: 0 });

  const handleGuideStateChange = useCallback((isShowing: boolean, currentStep: number) => {
    setGuideState({ isShowing, currentStep });
  }, []);

  // Show widget only when guide is not showing OR when on the voice assistant step
  const showWidget = !guideState.isShowing || guideState.currentStep === VOICE_ASSISTANT_STEP;

  const menuItems = [
    { icon: FileText, label: 'Submit Complaint', path: '/student/complaints', guideId: 'complaint-card' },
    { icon: User, label: 'My Profile', path: '/student/profile', guideId: 'profile-card' },
  ];

  return (
    <div className="min-h-screen animate-fade-in">
      <DashboardGuide
        steps={guideSteps}
        storageKey="brocamp-student-guide-seen"
        dashboardName="Student Portal"
        onGuideStateChange={handleGuideStateChange}
      />

      <header className="border-b border-border p-4 flex justify-between items-center animate-slide-in-left" data-guide="header">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-foreground text-background px-2 inline-block hover:animate-glitch">BRO</span>CAMP
          </h1>
          <span className="text-xs text-muted-foreground tracking-wider">
            {userRole === 'super_admin' ? 'SUPER ADMIN' : userRole === 'admin' ? 'ADMIN' : 'STUDENT PORTAL'}
          </span>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground hover:border-foreground hover-scale"
        >
          SIGN OUT
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 animate-fade-in-up animate-delay-200">
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item, index) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-guide={item.guideId}
                className="border border-border p-8 hover:border-foreground transition-all duration-300 text-left group hover-scale animate-fade-in-up"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <item.icon className="w-8 h-8 mb-4 text-muted-foreground group-hover:text-foreground transition-colors duration-300" />
                <h3 className="text-xl font-bold tracking-tight">{item.label}</h3>
              </button>
            ))}
          </div>
        </div>
      </main>
      
      {showWidget && (
        <div data-guide="voice-widget">
          <ElevenLabsWidget />
        </div>
      )}
    </div>
  );
}
