import React from "react";

interface FocusTrapProps {
  onEscape: () => void;
  children: React.ReactNode;
}

const FocusTrap: React.FC<FocusTrapProps> = ({ onEscape, children }) => {
  return <div>{children}</div>;
};

interface LikePlusModalProps {
  selected: Set<string>;
  dir: string;
  engine: string;
  topK: number;
  onClose: () => void;
  setSelectedView: (view: string) => void;
  photoActions: {
    setResults: (results: any[]) => void;
  };
  uiActions: {
    setBusy: (message: string) => void;
    setNote: (message: string) => void;
  };
}

export const LikePlusModal: React.FC<LikePlusModalProps> = ({
  selected,
  dir,
  engine,
  topK,
  onClose,
  setSelectedView,
  photoActions,
  uiActions,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onKeyDown={(e)=>{ if(e.key==='Escape') onClose() }}>
      <FocusTrap onEscape={onClose}>
        <div className="bg-white rounded-lg p-4 w-full max-w-md" role="dialog" aria-modal="true">
          <div className="font-semibold mb-2">Similar + Text</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const text = (
                form.elements.namedItem("text") as HTMLInputElement
              ).value.trim();
              const weight = parseFloat(
                (form.elements.namedItem("weight") as HTMLInputElement)
                  .value
              );
              if (selected.size === 1) {
                try {
                  const p = Array.from(selected)[0];
                  const { apiSearchLikePlus } = await import("../../api");
                  uiActions.setBusy("Searching…");
                  const r = await apiSearchLikePlus(
                    dir,
                    p,
                    engine,
                    topK,
                    text || undefined,
                    Number.isNaN(weight) ? 0.5 : weight
                  );
                  photoActions.setResults(r.results || []);
                  setSelectedView("results");
                } catch (e) {
                  uiActions.setNote(
                    e instanceof Error ? e.message : "Search failed"
                  );
                } finally {
                  uiActions.setBusy("");
                }
              }
              onClose();
            }}
          >
            <label className="block text-sm mb-1" htmlFor="likeplus-text">
              Text (optional)
            </label>
            <input
              id="likeplus-text"
              name="text"
              className="w-full border rounded px-2 py-1"
              placeholder="e.g. beach at sunset"
            />
            <label className="block text-sm mt-3 mb-1" htmlFor="mix-weight">
              Weight (image vs text)
            </label>
            <input
              id="mix-weight"
              name="weight"
              type="range"
              min="0"
              max="1"
              step="0.05"
              defaultValue="0.5"
              className="w-full"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 rounded border"
                onClick={onClose}
                aria-label="Cancel similar search"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-blue-600 text-white"
                aria-label="Search for similar photos with text"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
};