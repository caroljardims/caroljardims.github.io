import { useState } from "react";
import { textos, type Texto } from "../data/textos";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TextosSection() {
  const [open, setOpen] = useState<Texto | null>(null);

  return (
    <>
      <ul className="flex flex-col gap-4">
        {textos.map((t) => (
          <li key={t.slug}>
            <button
              onClick={() => setOpen(t)}
              className="w-full text-left group bg-white dark:bg-slate-800 border border-peachy-200 dark:border-slate-700 rounded-2xl overflow-hidden hover:border-peachy-400 dark:hover:border-peachy-500 transition-colors shadow-sm"
            >
              <div className="relative h-36 overflow-hidden bg-peachy-50 dark:bg-slate-700 pointer-events-none">
                <iframe
                  src={t.notionUrl}
                  className="absolute top-0 left-0 border-0"
                  style={{ width: "200%", height: "200%", transform: "scale(0.5) translateY(-50px)", transformOrigin: "top left" }}
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-slate-800" />
              </div>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-4 py-3">
              <button
                onClick={() => setOpen(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors text-lg leading-none"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <iframe
              src={open.notionUrl}
              className="flex-1 w-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
