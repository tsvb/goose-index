import { formatShortDate } from "@/lib/queries/format";

type CoachsNotesProps = {
  data: {
    show_id: number;
    show_date: string;
    title: string | null;
    venue_name: string | null;
    coach_notes: string;
    bandcamp_url: string | null;
  }[];
};

export function CoachsNotes({ data }: CoachsNotesProps) {
  if (!data || data.length === 0) {
    return (
      <div className="surface-card p-6 text-center text-muted font-mono">
        <p>No notes found in the archives.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((note) => (
        <div key={note.show_id} className="relative group overflow-hidden rounded-xl border border-line-soft bg-[#0a0a0a]">
          {/* Vintage terminal header */}
          <div className="bg-[#111111] border-b border-line-soft px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              <span className="ml-2 font-mono text-xs text-faint uppercase tracking-widest">
                coach_notes_{note.show_date.replace(/-/g, '')}.txt
              </span>
            </div>
            {note.bandcamp_url && (
              <a 
                href={note.bandcamp_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-mono text-xs text-gold hover:text-gold/80 flex items-center gap-1 transition-colors"
              >
                [LISTEN] ↗
              </a>
            )}
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <h3 className="font-display text-ink text-xl">{new Date(note.show_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h3>
              <p className="text-muted text-sm font-mono mt-1">@ {note.venue_name}</p>
            </div>
            
            <div className="font-mono text-sm text-[#e0e0e0] leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-gold/30">
              {note.coach_notes}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
