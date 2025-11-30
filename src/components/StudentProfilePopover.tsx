import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Calendar, Twitter, Instagram, Linkedin, Github, Mail, GraduationCap, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface StudentProfile {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  year: string | null;
  social_twitter: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_github: string | null;
  created_at: string;
}

interface StudentProfilePopoverProps {
  profile: StudentProfile | null;
  isAnonymous?: boolean;
  children?: React.ReactNode;
}

export function StudentProfilePopover({ profile, isAnonymous, children }: StudentProfilePopoverProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isAnonymous || !profile) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 border border-gray-800">
          <AvatarFallback className="bg-gray-900 text-gray-500 text-sm">?</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium text-gray-400">Anonymous</p>
          <p className="text-xs text-gray-600">Identity hidden</p>
        </div>
      </div>
    );
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button className="flex items-center gap-3 hover:bg-gray-900/50 p-2 -m-2 rounded-lg transition-colors cursor-pointer">
          {children || (
            <>
              <Avatar className="w-10 h-10 border border-gray-800 hover:border-white transition-colors">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                <AvatarFallback className="bg-gray-900 text-white text-sm">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{profile.full_name}</p>
                <p className="text-xs text-gray-500">{profile.email}</p>
              </div>
            </>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 bg-black border border-gray-800 p-0 animate-fade-in"
        align="start"
      >
        {/* Header with avatar and name */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-gray-800">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-gray-900 text-white text-lg">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-bold text-white truncate">{profile.full_name}</h4>
              {profile.email && (
                <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-sm text-gray-300 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Details */}
        <div className="px-4 py-3 space-y-2 border-b border-gray-800">
          {profile.department && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Building2 className="w-4 h-4 text-gray-600" />
              <span>{profile.department}</span>
            </div>
          )}
          {profile.year && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <GraduationCap className="w-4 h-4 text-gray-600" />
              <span>{profile.year}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span>Joined {format(new Date(profile.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>

        {/* Social links */}
        {(profile.social_twitter || profile.social_instagram || profile.social_linkedin || profile.social_github) && (
          <div className="px-4 py-3 flex items-center gap-3">
            {profile.social_twitter && (
              <a 
                href={`https://twitter.com/${profile.social_twitter}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {profile.social_instagram && (
              <a 
                href={`https://instagram.com/${profile.social_instagram}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {profile.social_linkedin && (
              <a 
                href={`https://linkedin.com/in/${profile.social_linkedin}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {profile.social_github && (
              <a 
                href={`https://github.com/${profile.social_github}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}