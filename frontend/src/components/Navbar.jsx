import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sun, Moon, LogOut, User, LayoutDashboard, Settings } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-40 glass-bar bg-background/80 border-b border-border/50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <button
          data-testid="navbar-logo"
          onClick={() => navigate(user ? '/dashboard' : '/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">SB</span>
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:inline">StudyBoard</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            data-testid="theme-toggle-btn"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-testid="user-menu-btn" className="flex items-center gap-2 rounded-full hover:bg-muted p-1 pr-3 transition-colors">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.picture} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-3.5 w-3.5 mr-2" /> Tableaux
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-3.5 w-3.5 mr-2" /> Mon profil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-testid="logout-btn" onClick={handleLogout}>
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Deconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isLanding ? (
            <Button
              data-testid="nav-login-btn"
              variant="default"
              size="sm"
              className="rounded-full"
              onClick={() => navigate('/auth')}
            >
              Se connecter
            </Button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
