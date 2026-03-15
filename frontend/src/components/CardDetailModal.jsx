import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarIcon, Tag, Plus, Trash2, Send, X, CheckSquare, MessageSquare, AlertTriangle, Pencil, Save
} from 'lucide-react';

const SUGGESTED_TAGS = ['Maths', 'Histoire', 'Sciences', 'Projet', 'Revision', 'Lecture', 'Exercice', 'Examen'];

export default function CardDetailModal({ card, open, onClose, onUpdate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [checklists, setChecklists] = useState([]);
  const [checkInput, setCheckInput] = useState('');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    if (card && open) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setPriority(card.priority || 'medium');
      setDueDate(card.due_date ? new Date(card.due_date) : null);
      setTags(card.tags || []);
      setChecklists(card.checklists || []);
      fetchComments();
    }
  }, [card, open]);

  const fetchComments = async () => {
    if (!card) return;
    try {
      const res = await api.get(`/comments/${card.card_id}`);
      setComments(res.data);
    } catch {}
  };

  const saveCard = async () => {
    setSaving(true);
    try {
      await api.put(`/cards/${card.card_id}`, {
        title, description, priority,
        due_date: dueDate ? dueDate.toISOString() : null,
        tags,
      });
      toast.success('Carte mise a jour');
      onUpdate?.();
    } catch {
      toast.error('Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t]);
      setTagInput('');
    }
  };

  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));

  const addChecklistItem = async () => {
    if (!checkInput.trim()) return;
    try {
      const res = await api.post(`/cards/${card.card_id}/checklist`, { text: checkInput });
      setChecklists(prev => [...prev, res.data]);
      setCheckInput('');
    } catch {
      toast.error('Erreur');
    }
  };

  const toggleChecklist = async (item) => {
    try {
      await api.put(`/cards/${card.card_id}/checklist/${item.item_id}`, { completed: !item.completed });
      setChecklists(prev => prev.map(c => c.item_id === item.item_id ? { ...c, completed: !c.completed } : c));
    } catch {}
  };

  const deleteChecklistItem = async (itemId) => {
    try {
      await api.delete(`/cards/${card.card_id}/checklist/${itemId}`);
      setChecklists(prev => prev.filter(c => c.item_id !== itemId));
    } catch {}
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await api.post('/comments', { card_id: card.card_id, text: commentText });
      setComments(prev => [res.data, ...prev]);
      setCommentText('');
    } catch {
      toast.error('Erreur');
    }
  };

  const checkProgress = checklists.length > 0
    ? Math.round((checklists.filter(c => c.completed).length / checklists.length) * 100)
    : 0;

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="card-detail-modal">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  data-testid="card-title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false); }}
                />
                <Button size="icon" variant="ghost" onClick={() => setEditingTitle(false)}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <DialogTitle
                className="flex-1 cursor-pointer hover:text-primary/80 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {title} <Pencil className="inline h-3.5 w-3.5 ml-1 text-muted-foreground" />
              </DialogTitle>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-6 pb-4">
            {/* Priority & Due Date Row */}
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Priorite</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger data-testid="priority-select" className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Date limite</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      data-testid="due-date-btn"
                      variant="outline"
                      className="h-8 text-xs px-3 justify-start font-normal"
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                      {dueDate ? format(dueDate, 'd MMM yyyy', { locale: fr }) : 'Choisir'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      data-testid="due-date-calendar"
                    />
                  </PopoverContent>
                </Popover>
                {dueDate && (
                  <button className="text-[10px] text-muted-foreground hover:text-destructive ml-1" onClick={() => setDueDate(null)}>
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Description</Label>
              <Textarea
                data-testid="card-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajouter une description..."
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                <Tag className="inline h-3.5 w-3.5 mr-1" /> Tags
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  data-testid="tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Ajouter un tag..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addTag(tagInput)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 5).map(t => (
                  <button
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => addTag(t)}
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                  <CheckSquare className="inline h-3.5 w-3.5 mr-1" /> Checklist
                </Label>
                {checklists.length > 0 && (
                  <span className="text-xs text-muted-foreground">{checkProgress}%</span>
                )}
              </div>
              {checklists.length > 0 && (
                <Progress value={checkProgress} className="h-1.5" data-testid="checklist-progress" />
              )}
              <div className="space-y-1.5">
                {checklists.map(item => (
                  <div key={item.item_id} className="flex items-center gap-2 group/item">
                    <Checkbox
                      data-testid={`checklist-item-${item.item_id}`}
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklist(item)}
                    />
                    <span className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <button
                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={() => deleteChecklistItem(item.item_id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  data-testid="checklist-input"
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                  placeholder="Nouvel element..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                />
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addChecklistItem}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
                <MessageSquare className="inline h-3.5 w-3.5 mr-1" /> Commentaires
              </Label>
              <div className="flex gap-2">
                <Input
                  data-testid="comment-input"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ecrire un commentaire..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComment(); } }}
                />
                <Button size="sm" variant="default" className="h-8" onClick={addComment} data-testid="send-comment-btn">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment.comment_id} className="flex gap-2.5">
                    <Avatar className="h-6 w-6 mt-0.5">
                      <AvatarImage src={comment.user?.picture} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {comment.user?.name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">{comment.user?.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(comment.created_at), 'd MMM HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5">{comment.text}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucun commentaire</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
          <Button
            data-testid="save-card-btn"
            size="sm"
            onClick={saveCard}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
