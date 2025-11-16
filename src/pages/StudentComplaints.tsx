import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function StudentComplaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('complaints').insert({
        user_id: isAnonymous ? null : user.id,
        title,
        description,
        is_anonymous: isAnonymous,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Complaint submitted successfully');
      setTitle('');
      setDescription('');
      setIsAnonymous(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4">
        <Button
          onClick={() => navigate('/student')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Submit Complaint</h1>
            <p className="text-gray-400 text-sm">Your voice matters. Submit anonymously if needed.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 border border-gray-850 p-8">
            <div className="flex items-center justify-between pb-6 border-b border-gray-850">
              <div>
                <Label htmlFor="anonymous" className="text-sm font-medium">
                  Submit Anonymously
                </Label>
                <p className="text-xs text-gray-500 mt-1">Your identity will be hidden</p>
              </div>
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs tracking-wider text-gray-400">
                TITLE
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                className="bg-transparent border-gray-850 focus:border-white"
                placeholder="Brief description of the issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs tracking-wider text-gray-400">
                DESCRIPTION
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={1000}
                rows={6}
                className="bg-transparent border-gray-850 focus:border-white resize-none"
                placeholder="Provide detailed information about your complaint..."
              />
              <p className="text-xs text-gray-500 text-right">{description.length}/1000</p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-gray-200 font-medium tracking-wider"
            >
              {loading ? 'SUBMITTING...' : 'SUBMIT COMPLAINT'}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
