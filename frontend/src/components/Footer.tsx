import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { Wordmark } from './Masthead';

type FooterLink = { label: string; to?: string; href?: string };

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', to: '/admin' },
      { label: 'Incident', to: '/incident' },
      { label: 'War room', to: '/warroom' },
      { label: 'Scope', to: '/scope' },
      { label: 'Drill Night', to: '/drill' },
    ],
  },
  {
    title: 'Records',
    links: [
      { label: 'Audit log', to: '/docs' },
      { label: 'Reports', to: '/editor' },
      { label: 'Export', to: '/export' },
      { label: 'Team', to: '/members' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: 'https://fifthedgestudios.com/' },
      { label: 'Press', href: 'https://fifthedgestudios.com/press' },
      { label: 'itch.io', href: 'https://fifthedgestudios.itch.io' },
      { label: 'Source code', href: 'https://github.com/prestonctx2006-rgb/HackUTD2026' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/legal#privacy' },
      { label: 'Terms', to: '/legal#terms' },
      { label: 'Security', to: '/legal#security' },
      { label: 'System status', to: '/debug' },
    ],
  },
];

const linkCls = 'inline-flex items-center gap-1 text-[13px] text-fg-muted transition-colors hover:text-fg';

/** Site footer: brand, page links, company links, legal, copyright. */
export const Footer: React.FC = () => (
  <footer className="border-t border-line-strong bg-bg">
    <div className="mx-auto max-w-[1240px] px-4 pt-12 pb-8 md:px-8">
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-6">
        <div className="col-span-2 space-y-4">
          <Link to="/admin" aria-label="Fifth Edge home" className="inline-block">
            <Wordmark size="sm" />
          </Link>
          <p className="max-w-xs text-[13px] leading-relaxed text-fg-muted">
            The out-of-band crisis command center for small businesses, with a monthly multiplayer drill to keep the team ready.
          </p>
          <p className="flex items-center gap-2 text-xs text-fg-subtle">
            <span className="h-1.5 w-1.5 bg-brand" aria-hidden="true" />
            Runs outside company email, chat and SSO
          </p>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                      {l.label}
                      <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link to={l.to!} className={linkCls}>
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-xs text-fg-subtle md:flex-row md:items-center md:justify-between">
        <span>© {new Date().getFullYear()} Fifth Edge. All rights reserved.</span>
        <span>Built at HackUTD 2026 on SpacetimeDB · Not legal advice. Confirm notification duties with counsel.</span>
      </div>
    </div>
  </footer>
);
