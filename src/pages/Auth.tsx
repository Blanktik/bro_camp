import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;
        toast.success('Account created! Redirecting...');
        setShowLoadingScreen(true);
        setTimeout(() => {
          navigate('/student');
        }, 3000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success('Signed in successfully!');
        setShowLoadingScreen(true);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  if (showLoadingScreen) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-12 animate-scale-in">
          <h1 className="text-5xl font-bold mb-3 tracking-tighter">
            <span className="bg-white text-black px-2 inline-block hover:animate-glitch">BRO</span>CAMP
          </h1>
          <p className="text-gray-400 text-sm tracking-wider">BROTHER YOU NEVER HAD</p>
        </div>

        <div className="border border-gray-850 p-8 hover-border-white transition-colors duration-300 animate-fade-in-up animate-delay-200">
          <div className="flex mb-8 border-b border-gray-850">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 pb-3 text-sm tracking-wider transition-colors ${
                !isSignUp ? 'text-white border-b border-white' : 'text-gray-500'
              }`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 pb-3 text-sm tracking-wider transition-colors ${
                isSignUp ? 'text-white border-b border-white' : 'text-gray-500'
              }`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs tracking-wider text-gray-400">
                  FULL NAME
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="bg-transparent border-gray-850 focus:border-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-wider text-gray-400">
                EMAIL
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-transparent border-gray-850 focus:border-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-wider text-gray-400">
                PASSWORD
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-transparent border-gray-850 focus:border-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 font-medium tracking-wider"
            >
              {loading ? 'PROCESSING...' : isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
