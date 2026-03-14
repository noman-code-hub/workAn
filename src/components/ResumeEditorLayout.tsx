import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ResumeEditorLayoutProps {
  children: ReactNode;
}

export const ResumeEditorLayout = ({ children }: ResumeEditorLayoutProps) => {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="resume-editor-layout h-screen w-screen overflow-hidden bg-slate-100 text-slate-900">
      {children}
      <style>{`
        .resume-editor-layout * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};
