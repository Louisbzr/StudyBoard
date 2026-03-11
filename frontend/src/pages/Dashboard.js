import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Navbar from '@/components/Navbar';
import { Plus, MoreVertical, Layout, Trash2, Pencil } from 'lucide-react';

const BOARD_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function Dashboard() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColor, setNewColor] = useState('#4F46E5');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const fetchBoards = async () => {
    try {
      const res = await api.get('/boards');
      setBoards(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement des tableaux');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoards(); }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/boards', { title: newTitle, description: newDesc, color: newColor });
      setBoards(prev => [...prev, { ...res.data, total_cards: 0, list_count: 3 }]);
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
      toast.success('Tableau cree !');
      navigate(`/board/${res.data.board_id}`);
    } catch (err) {
      toast.error('Erreur lors de la creation');
    } finally {
      setCreating(false);
    }
  };

  const deleteBoard = async (boardId) => {
    try {
      await api.delete(`/boards/${boardId}`);
      setBoards(prev => prev.filter(b => b.board_id !== boardId));
      toast.success('Tableau supprime');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pt-8 pb-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mes tableaux</h1>
            <p className="text-muted-foreground mt-1 text-sm">Gerez vos projets et vos etudes</p>
          </div>
          <Button
            data-testid="create-board-btn"
            onClick={() => setShowCreate(true)}
            className="rounded-full active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4 mr-2" /> Nouveau tableau
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Layout className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun tableau</h3>
            <p className="text-muted-foreground mb-6 text-sm">Creez votre premier tableau pour commencer</p>
            <Button
              data-testid="create-first-board-btn"
              onClick={() => setShowCreate(true)}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Creer un tableau
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {boards.map((board, i) => (
              <motion.div
                key={board.board_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-card border border-border/40 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer"
                onClick={() => navigate(`/board/${board.board_id}`)}
                data-testid={`board-card-${board.board_id}`}
              >
                <div className="h-2" style={{ backgroundColor: board.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-base truncate flex-1 pr-2">{board.title}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button data-testid={`board-menu-${board.board_id}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/board/${board.board_id}`); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Ouvrir
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          data-testid={`delete-board-${board.board_id}`}
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteBoard(board.board_id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {board.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{board.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span>{board.list_count || 0} listes</span>
                    <span>{board.total_cards || 0} cartes</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Board Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau tableau</DialogTitle>
            <DialogDescription>Creez un tableau pour organiser vos taches</DialogDescription>
          </DialogHeader>
          <form onSubmit={createBoard} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="board-title">Titre</Label>
              <Input
                data-testid="board-title-input"
                id="board-title"
                placeholder="Ex: Projet de maths"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-desc">Description (optionnel)</Label>
              <Input
                data-testid="board-desc-input"
                id="board-desc"
                placeholder="Description du tableau..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <div className="flex gap-2 flex-wrap">
                {BOARD_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                    data-testid={`color-${c}`}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button data-testid="confirm-create-board-btn" type="submit" disabled={creating}>
                {creating ? 'Creation...' : 'Creer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
