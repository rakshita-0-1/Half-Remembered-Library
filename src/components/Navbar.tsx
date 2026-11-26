import { useState } from 'react';
import { BookOpen, Menu, X } from 'lucide-react';
import type { PageId } from '../types';

interface NavbarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'indexing', label: 'Indexing' },
  { id: 'about', label: 'How It Works' },
];

export function Navbar({ activePage, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (page: PageId) => {
    setMobileOpen(false);
    onNavigate(page);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-violet-300/15 bg-[#070b1a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        {/* Zone 1: Single-line Brand wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleSelect('home');
          }}
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-base font-bold tracking-tight text-slate-50 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          <BookOpen className="h-5 w-5 text-cyan-400" aria-hidden="true" />
          <span>The Half-Remembered Library</span>
        </a>

        {/* Zone 2: 5 concise single-line text nav links */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative shrink-0 cursor-pointer whitespace-nowrap py-1 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-opacity duration-150 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => handleSelect('search')}
            className="hidden shrink-0 cursor-pointer whitespace-nowrap rounded-lg bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:inline-flex"
          >
            Start Searching
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-violet-300/20 text-slate-200 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-violet-300/15 bg-[#090f24]/95 px-4 py-3 md:hidden"
          aria-label="Mobile Navigation"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activePage === item.id
                    ? 'bg-violet-500/20 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
