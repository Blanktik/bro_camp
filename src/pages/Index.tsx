import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LoadingScreen } from '@/components/LoadingScreen';

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && userRole) {
      if (userRole === 'admin' || userRole === 'super_admin') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="text-center max-w-2xl">
        <h1 className="text-7xl font-bold mb-6 tracking-tighter animate-scale-in">
          <span className="bg-white text-black px-2 inline-block hover:animate-glitch transition-all">BRO</span>CAMP
        </h1>
        <p className="text-gray-400 text-lg mb-6 tracking-wide leading-relaxed animate-fade-in-up animate-delay-200">
          Are you looking for SOMETHING MORE?? Whatever your past may be, if you are willing to work hard to change your future;
          We have BROCAMP for you.
        </p>
        <p className="text-gray-500 text-sm mb-10 tracking-wide uppercase animate-fade-in animate-delay-300">BROTHER YOU NEVER HAD</p>
        
        <div className="flex gap-4 justify-center animate-fade-in-up animate-delay-400">
          <Button
            onClick={() => navigate('/auth')}
            className="bg-white text-black hover:bg-gray-200 font-medium tracking-wider px-8 hover-scale hover-glow"
          >
            ENTER BROCAMP
          </Button>
        </div>

        <div className="mt-16 pt-8 border-t border-gray-900 animate-fade-in animate-delay-500">
          <p className="text-xs text-gray-600 tracking-wider">
            PREMIUM · FUTURISTIC · MINIMAL
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
