export default function FeedbackButton() {
  const mailto = "mailto:katungu1@yahoo.com?subject=Storepulse%20Feedback&body=Hi%20Katun,%0A%0AI%20just%20tried%20Storepulse%20and...";
  
  return (
    <a
      href={mailto}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-slate-800 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-slate-700 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      Feedback
    </a>
  );
}