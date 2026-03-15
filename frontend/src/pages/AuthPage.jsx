import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) { toast.error('Le nom est requis'); setLoading(false); return; }
        await register(email, password, name);
      }
      toast.success(mode === 'login' ? 'Connexion reussie !' : 'Compte cree !');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/40 via-transparent to-cyan-50/30 dark:from-indigo-950/30 dark:via-transparent dark:to-transparent" />
        <div className="relative z-10 p-12 max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SB</span>
            </div>
            <span className="font-bold text-xl tracking-tight">StudyBoard</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Votre espace d'organisation
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Creez des tableaux, organisez vos taches et collaborez avec vos camarades. StudyBoard rend la gestion de projets etudiants simple et agreable.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <button
            data-testid="back-to-home-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>

          <h1 className="text-2xl font-bold tracking-tight mb-1">
            {mode === 'login' ? 'Content de vous revoir' : 'Creer un compte'}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {mode === 'login' ? 'Connectez-vous pour continuer' : 'Inscrivez-vous pour commencer'}
          </p>

          {/* Google Auth */}
          <Button
            data-testid="google-auth-btn"
            variant="outline"
            className="w-full mb-6 rounded-lg h-11"
            onClick={loginWithGoogle}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">ou</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="register-name-input"
                    id="name"
                    placeholder="Jean Dupont"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-11 rounded-lg"
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="auth-email-input"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="auth-password-input"
                  id="password"
                  type="password"
                  placeholder="Minimum 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 rounded-lg"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <Button
              data-testid="auth-submit-btn"
              type="submit"
              className="w-full h-11 rounded-lg active:scale-[0.98] transition-all"
              disabled={loading}
            >
              {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Creer mon compte'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'login' ? "Pas encore de compte ?" : 'Deja un compte ?'}{' '}
            <button
              data-testid="auth-toggle-mode-btn"
              className="text-primary hover:underline font-medium"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? "S'inscrire" : 'Se connecter'}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
