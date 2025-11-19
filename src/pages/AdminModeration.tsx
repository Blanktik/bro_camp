import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';

export default function AdminModeration() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-850 p-4">
        <Button
          onClick={() => navigate('/admin')}
          variant="ghost"
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
      </header>

      <main className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Moderation Center</h1>
            <p className="text-gray-400 text-sm">Content moderation and safety controls</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="border border-gray-850 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-gray-400" />
                <h3 className="text-sm tracking-wider text-gray-400">FLAGGED CONTENT</h3>
              </div>
              <p className="text-3xl font-bold mb-2">0</p>
              <p className="text-xs text-gray-500">No content flagged</p>
            </div>

            <div className="border border-gray-850 p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-gray-400" />
                <h3 className="text-sm tracking-wider text-gray-400">PENDING REVIEWS</h3>
              </div>
              <p className="text-3xl font-bold mb-2">0</p>
              <p className="text-xs text-gray-500">All clear</p>
            </div>
          </div>

          <div className="border border-gray-850 p-12 text-center">
            <p className="text-gray-500 mb-2">Moderation features coming soon</p>
            <p className="text-xs text-gray-600">Review flagged content, manage user reports, and enforce community guidelines</p>
          </div>
        </div>
      </main>
    </div>
  );
}
