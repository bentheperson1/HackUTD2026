import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wordmark } from '../components/Masthead';
import { Footer } from '../components/Footer';

const SECTIONS = [
  {
    id: 'privacy',
    title: 'Privacy',
    body: [
      'Outpost stores what your team puts into it: names, personal phone numbers, roles, chat messages, tasks, scope records, documents and the incident timeline.',
      'That data lives in a SpacetimeDB database separate from your company systems. It is used only to run your crisis room and drills, and is never sold or shared for advertising.',
      'Phone numbers are used to sign people in. This prototype does not send real text messages yet.',
    ],
  },
  {
    id: 'terms',
    title: 'Terms',
    body: [
      'Outpost is a prototype and is provided as is, without warranties. Do not rely on it as your only incident response tool.',
      'Templates, scope tracking and drill content are general guidance, not legal advice. Confirm notification duties and regulator contacts with qualified counsel.',
      'You are responsible for who you add to your roster and for the content they post.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    body: [
      'Every change goes through a server function that checks the caller: roles decide who can activate, close, edit scope, post in the Executive room or host a drill.',
      'The timeline is append-only. There is no function to edit or delete entries.',
      'Insurer and outside counsel access is limited to one incident and expires automatically after 1 to 30 days.',
      'Found a security issue? Open a private report on the project repository.',
    ],
  },
];

/** Privacy, terms and security notes. Public: reachable without signing in. */
export const LegalPage: React.FC = () => {
  const { hash } = useLocation();
  useEffect(() => {
    const el = hash ? document.getElementById(hash.slice(1)) : null;
    if (el) el.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, [hash]);

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line-strong">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-4 md:px-8">
          <Link to="/incident" aria-label="Outpost home">
            <Wordmark />
          </Link>
          <Link to="/incident" className="text-[13px] font-medium text-fg-muted hover:text-fg">
            Back to the app →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-4 pt-12 pb-20 md:px-8">
        <div className="text-[11px] font-semibold tracking-[0.09em] text-fg-subtle uppercase">Legal</div>
        <h1 className="font-display mt-1 text-[48px] leading-none font-bold uppercase">Privacy, terms and security</h1>
        <p className="mt-3 text-sm text-fg-muted">Plain-language notes for Outpost. Last updated November 2026.</p>
        <nav className="mt-6 flex gap-5 border-b border-line text-[14px]" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="border-b-2 border-transparent pb-2 text-fg-muted hover:border-brand hover:text-fg">
              {s.title}
            </a>
          ))}
        </nav>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-6 pt-10">
            <h2 className="font-display text-[26px] font-bold uppercase">{s.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {s.body.map((t) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-fg-muted">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-brand" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
};
