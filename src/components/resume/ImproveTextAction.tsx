import { useEffect, useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AI_IMPROVE_MAX_INPUT_CHARS, improveText, type ImproveTextType } from '../../services/aiTextService';

type ImproveTextActionProps = {
  text: string;
  type: ImproveTextType;
  onAccept: (value: string) => void;
  className?: string;
};

const CLICK_DEBOUNCE_MS = 350;

export const ImproveTextAction = ({
  text,
  type,
  onAccept,
  className,
}: ImproveTextActionProps) => {
  const [loading, setLoading] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [error, setError] = useState('');
  const [lastRequestedText, setLastRequestedText] = useState('');
  const timerRef = useRef<number | null>(null);

  const normalizedText = text.trim();
  const charCount = normalizedText.length;
  const isTooLong = charCount > AI_IMPROVE_MAX_INPUT_CHARS;
  const isDisabled = !normalizedText || isTooLong || loading;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lastRequestedText) return;
    if (normalizedText !== lastRequestedText) {
      setPreviewText('');
      setError('');
    }
  }, [lastRequestedText, normalizedText]);

  const runImprove = async () => {
    setLoading(true);
    setError('');
    setPreviewText('');
    setLastRequestedText(normalizedText);

    try {
      const result = await improveText({ text: normalizedText, type });
      setPreviewText(result.improved_text.trim());
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to improve the text right now.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImproveClick = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      void runImprove();
    }, CLICK_DEBOUNCE_MS);
  };

  const handleRetryClick = () => {
    if (!normalizedText || loading) return;
    handleImproveClick();
  };

  const handleAccept = () => {
    if (!previewText) return;
    onAccept(previewText);
    setPreviewText('');
    setError('');
    setLastRequestedText('');
  };

  const handleReject = () => {
    setPreviewText('');
    setError('');
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleImproveClick}
          disabled={isDisabled}
          className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Improving...' : 'Improve Text'}
        </button>
        <span className={`text-xs ${isTooLong ? 'text-red-600' : 'text-gray-500'}`}>
          {charCount}/{AI_IMPROVE_MAX_INPUT_CHARS}
        </span>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetryClick}
            className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      ) : null}

      {previewText ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            AI suggestion
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{previewText}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={handleReject}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
