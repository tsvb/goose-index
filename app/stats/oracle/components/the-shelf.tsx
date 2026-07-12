"use client";

type TheShelfProps = {
  data: {
    name: string;
    last_played_date: string;
    total_plays: number;
    days_since_played: number;
  }[];
};

export function TheShelf({ data }: TheShelfProps) {
  if (!data || data.length === 0) return null;
  
  return (
    <div className="surface-card p-6">
      <div className="space-y-6">
        {data.map((song, index) => (
          <div key={song.name} className="flex items-center gap-4 group">
            <div className="w-8 h-8 rounded-full bg-surface-hover border border-line-soft flex items-center justify-center font-mono text-faint text-xs shrink-0">
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between mb-1">
                <h4 className="font-display text-ink text-lg truncate pr-4">{song.name}</h4>
                <span className="font-mono text-gold text-lg shrink-0">
                  {song.days_since_played} <span className="text-sm text-faint">days</span>
                </span>
              </div>
              
              <div className="w-full h-1 bg-line-soft rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gold/50" 
                  style={{ 
                    // Calculate a rough width relative to the #1 longest gap
                    width: `${Math.max(5, (song.days_since_played / data[0].days_since_played) * 100)}%` 
                  }} 
                />
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs font-mono text-faint">
                <span>Last seen: {new Date(song.last_played_date).toLocaleDateString()}</span>
                <span>Total plays: {song.total_plays}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
