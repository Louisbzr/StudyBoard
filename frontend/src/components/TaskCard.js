import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, MessageSquare, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const priorityColors = {
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  low: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900',
};

const priorityLabels = { urgent: 'Urgent', high: 'Haute', medium: 'Moyenne', low: 'Basse' };

const tagColors = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
];

export default function TaskCard({ card, onClick, isDragging }) {
  const checklistTotal = card.checklists?.length || 0;
  const checklistDone = card.checklists?.filter(c => c.completed).length || 0;
  const isOverdue = card.due_date && new Date(card.due_date) < new Date();

  return (
    <div
      data-testid={`task-card-${card.card_id}`}
      onClick={() => onClick?.(card)}
      className={`bg-card border border-border/50 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group priority-${card.priority} ${isDragging ? 'drag-overlay' : ''}`}
    >
      {/* Tags */}
      {card.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {card.tags.slice(0, 3).map((tag, i) => (
            <span
              key={tag}
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${tagColors[i % tagColors.length]}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-sm font-medium leading-snug mb-2 group-hover:text-primary/90 transition-colors">
        {card.title}
      </h4>

      {/* Description preview */}
      {card.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{card.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority */}
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${priorityColors[card.priority] || priorityColors.medium}`}>
          {priorityLabels[card.priority] || 'Moyenne'}
        </span>

        {/* Due date */}
        {card.due_date && (
          <span className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
            <Calendar className="h-3 w-3" />
            {format(new Date(card.due_date), 'd MMM', { locale: fr })}
          </span>
        )}

        {/* Checklist progress */}
        {checklistTotal > 0 && (
          <span className={`flex items-center gap-1 text-[10px] ${checklistDone === checklistTotal ? 'text-green-600' : 'text-muted-foreground'}`}>
            <CheckSquare className="h-3 w-3" />
            {checklistDone}/{checklistTotal}
          </span>
        )}
      </div>
    </div>
  );
}
