import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
      <div className="relative flex items-center gap-2 py-3 px-6">
        <Search className="size-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by team..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="cursor-pointer absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
  );
}
