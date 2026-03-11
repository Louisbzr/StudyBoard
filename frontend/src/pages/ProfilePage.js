import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Layout, CheckSquare, Calendar, AlertTriangle, Tag, TrendingUp, Pencil, Save, X
} from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setName(user.name || '');
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch {}
  };

  const saveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.put('/profile', { name });
      setUser(prev => ({ ...prev, name: res.data.name }));
      setEditing(false);
      toast.success('Profil mis a jour');
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(false);
    }
  };

  const statCards = stats ? [
    { label: 'Tableaux', value: stats.total_boards, icon: Layout, color: 'text-primary' },
    { label: 'Cartes totales', value: stats.total_cards, icon: CheckSquare, color: 'text-blue-500' },
    { label: 'Completees', value: stats.completed_cards, icon: TrendingUp, color: 'text-green-500' },
    { label: 'En retard', value: stats.overdue_cards, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Deadlines (7j)', value: stats.upcoming_deadlines, icon: Calendar, color: 'text-amber-500' },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          {/* Profile Header */}
          <div className="bg-card border border-border/40 rounded-2xl p-8 mb-8" data-testid="profile-card">
            <div className="flex items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.picture} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                {editing ? (
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      data-testid="profile-name-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-xl font-bold h-10 max-w-xs"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                    />
                    <Button size="icon" variant="ghost" onClick={saveName} disabled={saving}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(false); setName(user?.name || ''); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-bold tracking-tight">{user?.name}</h1>
                    <button
                      data-testid="edit-profile-btn"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setEditing(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="text-muted-foreground">{user?.email}</p>
                {stats && (
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs">
                      {stats.completion_rate}% completion
                    </Badge>
                    {stats.checklist_total > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {stats.checklist_done}/{stats.checklist_total} sous-taches
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <h2 className="text-lg font-bold tracking-tight mb-4">Statistiques</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border/40 rounded-xl p-4"
                data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Progress */}
          {stats && stats.total_cards > 0 && (
            <div className="bg-card border border-border/40 rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-3">Progression globale</h3>
              <Progress value={stats.completion_rate} className="h-2.5 mb-2" data-testid="global-progress" />
              <p className="text-sm text-muted-foreground">
                {stats.completed_cards} sur {stats.total_cards} cartes terminees ({stats.completion_rate}%)
              </p>
            </div>
          )}

          {/* Checklist Progress */}
          {stats && stats.checklist_total > 0 && (
            <div className="bg-card border border-border/40 rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-3">Sous-taches (Checklists)</h3>
              <Progress
                value={Math.round((stats.checklist_done / stats.checklist_total) * 100)}
                className="h-2.5 mb-2"
              />
              <p className="text-sm text-muted-foreground">
                {stats.checklist_done} sur {stats.checklist_total} elements completes
              </p>
            </div>
          )}

          {/* Top Tags */}
          {stats?.top_tags?.length > 0 && (
            <div className="bg-card border border-border/40 rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-3">
                <Tag className="inline h-4 w-4 mr-1.5" /> Tags les plus utilises
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.top_tags.map(([tag, count]) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag} <span className="ml-1 text-muted-foreground">({count})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Cards */}
          {stats?.overdue_list?.length > 0 && (
            <div className="bg-card border border-red-200 dark:border-red-900/50 rounded-xl p-6">
              <h3 className="font-semibold mb-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="inline h-4 w-4 mr-1.5" /> Cartes en retard
              </h3>
              <div className="space-y-2">
                {stats.overdue_list.map(card => (
                  <div key={card.card_id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{card.title}</span>
                    <span className="text-xs text-red-500 font-medium">
                      {card.due_date ? new Date(card.due_date).toLocaleDateString('fr-FR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
