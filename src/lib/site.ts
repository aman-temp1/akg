export const SITE = {
  name: 'Aman Gupta',
  title: 'Aman Gupta, full-stack GenAI engineer',
  description:
    'Aman Gupta is a full-stack GenAI engineer at Accenture, building AI products end to end, from models and retrieval pipelines to the interfaces people use.',
  url: 'https://amangupta.me',
  email: 'amangupta.main@gmail.com',
  location: 'Pune, India',
  timeZone: 'Asia/Kolkata',
  resume: '/resume.pdf',
};

export const NAV = [
  { href: '/work', label: 'Work' },
  { href: '/writing', label: 'Writing' },
  { href: '/about', label: 'About' },
  { href: '/lab', label: 'Lab' },
  { href: '/contact', label: 'Contact' },
];

/** Work history, newest first. Shown on the home page and on About. */
export const EXPERIENCE = [
  { when: 'Jul 2026 to now', what: 'Full-stack GenAI Engineer', where: 'Accenture', note: 'Joined on 24 July 2026.' },
  { when: 'From 2024', what: 'Machine Learning Associate', where: 'AISOC KIIT', note: 'Built ML pipelines, led workshops, mentored 20+ members, ran hackathons for 200+ people.' },
];

export const SOCIALS = [
  { href: 'https://github.com/amangupta143', label: 'GitHub' },
  { href: 'https://www.linkedin.com/in/amangupta143', label: 'LinkedIn' },
  { href: 'https://x.com/aman_gupta_143', label: 'X' },
];

export const pad = (n: number) => String(n).padStart(2, '0');

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const readingTime = (text = '') => Math.max(1, Math.round(text.split(/\s+/).length / 230));
