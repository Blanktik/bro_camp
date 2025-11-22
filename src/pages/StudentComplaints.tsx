import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Upload, X, Image as ImageIcon, Film, Check, Info, Edit2, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { CallAdminButton } from '@/components/CallAdminButton';
import { useAdminStatus } from '@/hooks/useAdminStatus';

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  media_urls: string[] | null;
  viewed_at: string | null;
  edited_at: string | null;
  is_anonymous: boolean;
}

export default function StudentComplaints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { onlineAdminsCount } = useAdminStatus();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<string | null>(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 20 * 1024 * 1024; // 20MB limit
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image or video`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} exceeds 20MB limit`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (): Promise<string[]> => {
    if (selectedFiles.length === 0) return [];
    
    setUploadingFiles(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('complaint-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('complaint-media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
    } finally {
      setUploadingFiles(false);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const mediaUrls = await uploadMedia();

      if (editingComplaint) {
        // Update existing complaint
        const { error } = await supabase
          .from('complaints')
          .update({
            title,
            description,
            media_urls: mediaUrls.length > 0 ? mediaUrls : null,
            edited_at: new Date().toISOString(),
          })
          .eq('id', editingComplaint);

        if (error) throw error;
        toast.success('Complaint updated successfully');
      } else {
        // Create new complaint
        const { error } = await supabase.from('complaints').insert({
          user_id: user.id,
          title,
          description,
          is_anonymous: isAnonymous,
          status: 'pending',
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        });

        if (error) throw error;
        toast.success('Complaint submitted successfully');
      }

      setTitle('');
      setDescription('');
      setIsAnonymous(false);
      setSelectedFiles([]);
      setShowForm(false);
      setEditingComplaint(null);
      fetchComplaints();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (complaint: Complaint) => {
    if (complaint.viewed_at || complaint.admin_response) {
      toast.error('Cannot edit complaint after admin has viewed or responded');
      return;
    }
    setTitle(complaint.title);
    setDescription(complaint.description);
    setSelectedFiles([]);
    setEditingComplaint(complaint.id);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setTitle('');
    setDescription('');
    setIsAnonymous(false);
    setSelectedFiles([]);
    setShowForm(false);
    setEditingComplaint(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-800 text-gray-300';
      case 'resolved':
        return 'bg-white text-black';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4 flex justify-between items-center">
        <Button
          onClick={() => navigate('/student')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
        {!showForm && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 border border-gray-850 text-xs">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">{onlineAdminsCount} ADMINS ONLINE</span>
            </div>
            <CallAdminButton />
            <Button
              onClick={() => setShowForm(true)}
              className="bg-white text-black hover:bg-gray-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              NEW COMPLAINT
            </Button>
          </div>
        )}
      </header>

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          {showForm ? (
            <>
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 tracking-tight">
                  {editingComplaint ? 'Edit Complaint' : 'Submit Complaint'}
                </h1>
                <p className="text-gray-400 text-sm">
                  {editingComplaint 
                    ? 'Update your complaint details before admin review' 
                    : 'Your voice matters. Submit anonymously if needed.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 border border-gray-850 p-8">
                {!editingComplaint && (
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
                )}

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

                <div className="space-y-2">
                  <Label className="text-xs tracking-wider text-gray-400">
                    MEDIA (OPTIONAL)
                  </Label>
                  <div className="border border-gray-850 border-dashed p-4 text-center hover:border-gray-700 transition-colors">
                    <input
                      type="file"
                      id="media-upload"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="media-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="w-8 h-8 text-gray-500" />
                      <p className="text-sm text-gray-400">Upload images or videos (max 5 files, 20MB each)</p>
                    </label>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative border border-gray-850 p-2 flex items-center gap-2">
                          {file.type.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Film className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-400 truncate flex-1">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-gray-500 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    className="flex-1 border-gray-850 text-gray-400 hover:text-white hover:border-white"
                  >
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || uploadingFiles}
                    className="flex-1 bg-white text-black hover:bg-gray-200 font-medium tracking-wider"
                  >
                    {uploadingFiles ? 'UPLOADING...' : loading ? (editingComplaint ? 'UPDATING...' : 'SUBMITTING...') : (editingComplaint ? 'UPDATE COMPLAINT' : 'SUBMIT COMPLAINT')}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2 tracking-tight">My Complaints</h1>
                <p className="text-gray-400 text-sm">{complaints.length} total complaints</p>
              </div>

              {fetchLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border border-white border-t-transparent animate-spin" />
                </div>
              ) : complaints.length === 0 ? (
                <div className="border border-gray-850 p-12 text-center">
                  <p className="text-gray-500">No complaints submitted yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.map((complaint) => (
                    <div
                      key={complaint.id}
                      className="border border-gray-850 p-6 hover:border-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">{complaint.title}</h3>
                            <Badge className={`text-xs tracking-wider ${getStatusColor(complaint.status)}`}>
                              {complaint.status.toUpperCase()}
                            </Badge>
                            {complaint.is_anonymous && (
                              <Badge className="text-xs tracking-wider bg-gray-800 text-gray-400">
                                ANONYMOUS
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {new Date(complaint.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(complaint)}
                                  disabled={!!complaint.viewed_at || !!complaint.admin_response}
                                  className="h-8 px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              {(complaint.viewed_at || complaint.admin_response) && (
                                <TooltipContent side="left" className="bg-black border-gray-850 text-white text-xs">
                                  <p>Cannot edit after admin {complaint.admin_response ? 'response' : 'viewed'}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {complaint.viewed_at ? (
                                <>
                                  <Check className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" strokeWidth={3} />
                                  <Check className="w-4 h-4 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] -ml-2.5" strokeWidth={3} />
                                </>
                              ) : (
                                <Check className="w-4 h-4 text-gray-600" strokeWidth={3} />
                              )}
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-gray-500 hover:text-gray-300 cursor-help transition-colors" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-black border-gray-850 text-white text-xs max-w-xs">
                                  <p className="mb-1">One tick: Complaint sent</p>
                                  <p>Two ticks: Viewed by admin</p>
                                  {complaint.viewed_at && (
                                    <p className="mt-2 pt-2 border-t border-gray-800 text-gray-400">
                                      Viewed: {format(new Date(complaint.viewed_at), 'MMM d, yyyy h:mm a')}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                        {complaint.description}
                      </p>

                      {complaint.media_urls && complaint.media_urls.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          {complaint.media_urls.map((url, idx) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border border-gray-850 hover:border-gray-700 transition-colors overflow-hidden aspect-video"
                            >
                              {url.includes('.mp4') || url.includes('.mov') || url.includes('.webm') ? (
                                <video src={url} className="w-full h-full object-cover" controls />
                              ) : (
                                <img src={url} alt="Complaint media" className="w-full h-full object-cover" />
                              )}
                            </a>
                          ))}
                        </div>
                      )}

                      {complaint.admin_response && (
                        <div className="border-t border-gray-850 pt-4 mt-4">
                          <p className="text-xs text-gray-500 mb-2 tracking-wider">ADMIN RESPONSE</p>
                          <p className="text-sm text-gray-300">{complaint.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
