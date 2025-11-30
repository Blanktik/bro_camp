import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Save, Twitter, Instagram, Linkedin, Github } from 'lucide-react';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'Computer Science',
  'Engineering',
  'Business',
  'Arts',
  'Science',
  'Medicine',
  'Law',
  'Other'
];

const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  'Graduate',
  'Other'
];

interface Profile {
  full_name: string;
  email: string | null;
  department: string | null;
  year: string | null;
  avatar_url: string | null;
  bio: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_github: string | null;
}

export default function StudentProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: null,
    department: null,
    year: null,
    avatar_url: null,
    bio: null,
    social_twitter: null,
    social_instagram: null,
    social_linkedin: null,
    social_github: null,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, department, year, avatar_url, bio, social_twitter, social_instagram, social_linkedin, social_github')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          department: profile.department,
          year: profile.year,
          bio: profile.bio,
          social_twitter: profile.social_twitter,
          social_instagram: profile.social_instagram,
          social_linkedin: profile.social_linkedin,
          social_github: profile.social_github,
        })
        .eq('id', user!.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center animate-slide-in-left">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold tracking-tighter">
            <span className="bg-white text-black px-2 inline-block hover:animate-glitch">BRO</span>CAMP
          </h1>
          <span className="text-xs text-gray-500 tracking-wider">PROFILE</span>
        </div>
        <Button
          onClick={signOut}
          variant="outline"
          className="border-gray-850 text-gray-400 hover:text-white hover:border-white hover-scale"
        >
          SIGN OUT
        </Button>
      </header>

      <main className="p-8 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/student')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 animate-fade-in-up"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm tracking-wider">BACK TO DASHBOARD</span>
        </button>

        <div className="space-y-8 animate-fade-in-up animate-delay-200">
          <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>

          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-gray-850 group-hover:border-white transition-colors">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="bg-gray-900 text-white text-xl">
                  {getInitials(profile.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-400">Click to upload new avatar</p>
              <p className="text-xs text-gray-600">Max 2MB, JPG/PNG</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-400 text-sm tracking-wider">EMAIL</Label>
              <Input
                id="email"
                value={profile.email || user?.email || ''}
                disabled
                className="bg-gray-900/50 border-gray-850 text-gray-500"
              />
              <p className="text-xs text-gray-600">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-gray-400 text-sm tracking-wider">FULL NAME</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department" className="text-gray-400 text-sm tracking-wider">DEPARTMENT</Label>
              <Select
                value={profile.department || ''}
                onValueChange={(value) => setProfile(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-850">
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept} className="hover:bg-gray-800">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year" className="text-gray-400 text-sm tracking-wider">YEAR</Label>
              <Select
                value={profile.year || ''}
                onValueChange={(value) => setProfile(prev => ({ ...prev, year: value }))}
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors">
                  <SelectValue placeholder="Select your year" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-850">
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year} className="hover:bg-gray-800">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-gray-400 text-sm tracking-wider">BIO</Label>
              <Textarea
                id="bio"
                value={profile.bio || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors min-h-[100px] resize-none"
                placeholder="Tell us about yourself..."
                maxLength={300}
              />
              <p className="text-xs text-gray-600">{(profile.bio?.length || 0)}/300 characters</p>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <Label className="text-gray-400 text-sm tracking-wider">SOCIAL LINKS</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={profile.social_twitter || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, social_twitter: e.target.value }))}
                    className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors pl-10"
                    placeholder="twitter username"
                  />
                </div>
                
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={profile.social_instagram || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, social_instagram: e.target.value }))}
                    className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors pl-10"
                    placeholder="instagram username"
                  />
                </div>
                
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={profile.social_linkedin || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, social_linkedin: e.target.value }))}
                    className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors pl-10"
                    placeholder="linkedin username"
                  />
                </div>
                
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={profile.social_github || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, social_github: e.target.value }))}
                    className="bg-gray-900/50 border-gray-850 focus:border-white transition-colors pl-10"
                    placeholder="github username"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black hover:bg-gray-200 transition-colors hover-scale"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                SAVING...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                SAVE CHANGES
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
