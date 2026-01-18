import { Link, Outlet, useLocation } from 'react-router-dom';
import { Gamepad2, ArrowLeft } from 'lucide-react';

export const ArcadeLayout = () => {
  const location = useLocation();
  const isHubPage = location.pathname === '/arcade';

  return (
    <div className="space-y-6">
      {/* Header Arcade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isHubPage && (
            <Link 
              to="/arcade" 
              className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Gamepad2 size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Arcade Hub</h1>
              {!isHubPage && (
                <p className="text-sm text-text-muted">Mini-jeux & Classements</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <Outlet />
    </div>
  );
};
