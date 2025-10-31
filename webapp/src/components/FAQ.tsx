"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How are the positions generated?",
    answer: "Our server plays 100 random move games each minute, and each position is evaluated by Stockfish. When a mating line is found, the position is stored as a puzzle. We only store unique positions each time."
  },
  {
    question: "What are M3, M6, M9, etc.?",
    answer: "M3 means there is checkmate within 1 to 3 moves. M6 means there is checkmate within 4 to 6 moves, and so on."
  },
  {
    question: "What is current eval and estimated eval?",
    answer: "Estimated eval is the evaluation value captured by our server during puzzle discovery. Current eval is Stockfish running on your device. There may be differences in evaluation due to different thinking times and Stockfish versions, but they usually converge quickly as the mating line becomes clear."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-900 mb-6">FAQ</h2>
      <div className="space-y-4">
        {faqData.map((item, index) => (
          <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleQuestion(index)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-slate-900">{item.question}</span>
              <ChevronDown
                className={`h-5 w-5 text-slate-500 transition-transform ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="mt-2 px-4 pb-3 text-slate-600">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

