import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DndContext, closestCorners, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api, { BACKEND_URL } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/Navbar';
import TaskCard from '@/components/TaskCard';
import CardDetailModal from '@/components/CardDetailModal';
import { Plus, ArrowLeft, MoreHorizontal, Trash2, X, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// ========== Sortable Card Wrapper ==========
function SortableCard({ card, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.card_id,
    data: { type: 'card', card, listId: card.list_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard card={card} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

// ========== Droppable List Column ==========
function ListColumn({ list, onAddCard, onDeleteList, onUpdateListTitle, onCardClick, children }) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [listTitle, setListTitle] = useState(list.title);
  const inputRef = useRef(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${list.list_id}`,
    data: { type: 'list', listId: list.list_id },
  });

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;
    await onAddCard(list.list_id, newCardTitle);
    setNewCardTitle('');
    setShowAddCard(false);
  };

  const handleTitleSave = async () => {
    if (listTitle.trim() && listTitle !== list.title) {
      await onUpdateListTitle(list.list_id, listTitle);
    }
    setEditingTitle(false);
  };

  return (
    <div className="list-column flex-shrink-0" data-testid={`list-column-${list.list_id}`}>
      <div className={`bg-secondary/50 dark:bg-secondary/30 rounded-xl border border-border/30 flex flex-col h-full transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
          {editingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                data-testid={`list-title-input-${list.list_id}`}
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                className="h-7 text-sm font-semibold"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleTitleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <h3
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setEditingTitle(true)}
            >
              {list.title}
              <span className="ml-2 text-xs font-normal">({list.cards?.length || 0})</span>
            </h3>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button data-testid={`list-menu-${list.list_id}`} className="p-1 rounded hover:bg-muted transition-colors">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                data-testid={`delete-list-${list.list_id}`}
                className="text-destructive"
                onClick={() => onDeleteList(list.list_id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer la liste
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Cards */}
        <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2 py-2 space-y-2 min-h-[60px]">
          <SortableContext items={(list.cards || []).map(c => c.card_id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {(list.cards || []).map(card => (
                <motion.div
                  key={card.card_id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  <SortableCard card={card} onClick={onCardClick} />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>
        </div>

        {/* Add Card */}
        <div className="px-2 pb-2">
          {showAddCard ? (
            <div className="space-y-2">
              <Input
                ref={inputRef}
                data-testid={`add-card-input-${list.list_id}`}
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Titre de la carte..."
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCard(); if (e.key === 'Escape') setShowAddCard(false); }}
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddCard}>Ajouter</Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowAddCard(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              data-testid={`add-card-btn-${list.list_id}`}
              onClick={() => setShowAddCard(true)}
              className="w-full flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" /> Ajouter une carte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Main Board View ==========
export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showAddList, setShowAddList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [activeCard, setActiveCard] = useState(null);
  const wsRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchBoard = useCallback(async () => {
    try {
      const res = await api.get(`/boards/${boardId}`);
      setBoard(res.data);
    } catch (err) {
      toast.error('Erreur lors du chargement du tableau');
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [boardId, navigate]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // WebSocket connection
  useEffect(() => {
    if (!boardId) return;
    const wsUrl = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/api/ws/${boardId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.board_id === boardId) {
          fetchBoard();
        }
      } catch {}
    };

    ws.onopen = () => {
      // Ping every 30s to keep alive
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 30000);
      ws._ping = ping;
    };

    ws.onclose = () => {
      if (ws._ping) clearInterval(ws._ping);
    };

    return () => {
      if (ws._ping) clearInterval(ws._ping);
      ws.close();
    };
  }, [boardId, fetchBoard]);

  // ========== DnD Handlers ==========
  const findListByCardId = (cardId) => {
    if (!board?.lists) return null;
    return board.lists.find(l => l.cards?.some(c => c.card_id === cardId));
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const list = findListByCardId(active.id);
    if (list) {
      const card = list.cards.find(c => c.card_id === active.id);
      setActiveCard(card);
    }
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id;
    const overId = over.id;

    // Find source list
    const sourceList = findListByCardId(activeId);
    if (!sourceList) return;

    // Determine target list
    let targetListId;
    if (String(overId).startsWith('droppable-')) {
      targetListId = overId.replace('droppable-', '');
    } else {
      const targetList = findListByCardId(overId);
      if (targetList) targetListId = targetList.list_id;
    }

    if (!targetListId || sourceList.list_id === targetListId) return;

    // Move card between lists locally
    setBoard(prev => {
      const newLists = prev.lists.map(l => ({ ...l, cards: [...(l.cards || [])] }));
      const srcIdx = newLists.findIndex(l => l.list_id === sourceList.list_id);
      const tgtIdx = newLists.findIndex(l => l.list_id === targetListId);
      if (srcIdx === -1 || tgtIdx === -1) return prev;

      const cardIdx = newLists[srcIdx].cards.findIndex(c => c.card_id === activeId);
      if (cardIdx === -1) return prev;

      const [movedCard] = newLists[srcIdx].cards.splice(cardIdx, 1);
      movedCard.list_id = targetListId;

      // Find insert position
      if (over.data?.current?.type === 'card') {
        const overIdx = newLists[tgtIdx].cards.findIndex(c => c.card_id === overId);
        newLists[tgtIdx].cards.splice(overIdx >= 0 ? overIdx : newLists[tgtIdx].cards.length, 0, movedCard);
      } else {
        newLists[tgtIdx].cards.push(movedCard);
      }

      return { ...prev, lists: newLists };
    });
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !board) return;

    const activeId = active.id;
    const overId = over.id;

    // Find source list (current state after drag over)
    const currentList = findListByCardId(activeId);
    if (!currentList) return;

    // Handle reorder within same list
    if (over.data?.current?.type === 'card') {
      const overList = findListByCardId(overId);
      if (overList && overList.list_id === currentList.list_id) {
        const oldIndex = currentList.cards.findIndex(c => c.card_id === activeId);
        const newIndex = currentList.cards.findIndex(c => c.card_id === overId);
        if (oldIndex !== newIndex) {
          setBoard(prev => {
            const newLists = prev.lists.map(l => {
              if (l.list_id === currentList.list_id) {
                return { ...l, cards: arrayMove([...l.cards], oldIndex, newIndex) };
              }
              return l;
            });
            return { ...prev, lists: newLists };
          });
        }
      }
    }

    // Persist to backend
    const card = currentList.cards.find(c => c.card_id === activeId);
    if (!card) return;
    const newPosition = currentList.cards.findIndex(c => c.card_id === activeId);

    try {
      const srcData = active.data?.current;
      const sourceListId = srcData?.listId || card.list_id;

      if (sourceListId !== currentList.list_id) {
        await api.put('/cards/move', {
          card_id: activeId,
          source_list_id: sourceListId,
          target_list_id: currentList.list_id,
          new_position: Math.max(0, newPosition),
        });
      } else {
        await api.put(`/cards/${activeId}`, { position: newPosition });
      }
    } catch {
      fetchBoard(); // Revert on error
    }
  };

  // ========== List/Card Actions ==========
  const addCard = async (listId, title) => {
    try {
      const res = await api.post('/cards', { title, list_id: listId });
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l =>
          l.list_id === listId ? { ...l, cards: [...(l.cards || []), res.data] } : l
        ),
      }));
    } catch {
      toast.error('Erreur lors de la creation');
    }
  };

  const addList = async () => {
    if (!newListTitle.trim()) return;
    try {
      const res = await api.post('/lists', { title: newListTitle, board_id: boardId });
      setBoard(prev => ({ ...prev, lists: [...prev.lists, { ...res.data, cards: [] }] }));
      setNewListTitle('');
      setShowAddList(false);
    } catch {
      toast.error('Erreur');
    }
  };

  const deleteList = async (listId) => {
    try {
      await api.delete(`/lists/${listId}`);
      setBoard(prev => ({ ...prev, lists: prev.lists.filter(l => l.list_id !== listId) }));
      toast.success('Liste supprimee');
    } catch {
      toast.error('Erreur');
    }
  };

  const updateListTitle = async (listId, title) => {
    try {
      await api.put(`/lists/${listId}`, { title });
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.map(l => l.list_id === listId ? { ...l, title } : l),
      }));
    } catch {}
  };

  const handleCardClick = (card) => setSelectedCard(card);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Board Header */}
      <div className="px-6 py-4 border-b border-border/30 bg-background/80 glass-bar">
        <div className="max-w-full flex items-center gap-4">
          <Button
            data-testid="back-to-dashboard-btn"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: board?.color }} />
            <h1 className="text-xl font-bold tracking-tight">{board?.title}</h1>
          </div>
          {board?.description && (
            <span className="text-sm text-muted-foreground hidden md:inline">{board.description}</span>
          )}
        </div>
      </div>

      {/* Board Canvas */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="board-canvas">
            {board?.lists?.map(list => (
              <ListColumn
                key={list.list_id}
                list={list}
                onAddCard={addCard}
                onDeleteList={deleteList}
                onUpdateListTitle={updateListTitle}
                onCardClick={handleCardClick}
              />
            ))}

            {/* Add List Button */}
            <div className="flex-shrink-0 w-72">
              {showAddList ? (
                <div className="bg-secondary/50 rounded-xl border border-border/30 p-3 space-y-2">
                  <Input
                    data-testid="add-list-input"
                    value={newListTitle}
                    onChange={(e) => setNewListTitle(e.target.value)}
                    placeholder="Titre de la liste..."
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') addList(); if (e.key === 'Escape') setShowAddList(false); }}
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={addList}>Ajouter</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowAddList(false)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  data-testid="add-list-btn"
                  onClick={() => setShowAddList(true)}
                  className="w-full flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 rounded-xl px-4 py-3 border border-dashed border-border/40 hover:border-border transition-all"
                >
                  <Plus className="h-4 w-4" /> Ajouter une liste
                </button>
              )}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeCard ? (
              <div className="drag-overlay w-72">
                <TaskCard card={activeCard} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdate={() => { fetchBoard(); setSelectedCard(null); }}
      />
    </div>
  );
}
