/**
 * Tactile Financial Calculator Keypad for DigiKhata
 * Replicates the custom 24-key embedded keypad shown in the design reference.
 * Allows quick merchant calculations directly before saving transactions.
 */

import React, { useState } from 'react';
import { Delete, ArrowRight } from 'lucide-react';

export default function KhataCalculator({ value, onChange, onDone }) {
  const [memory, setMemory] = useState(0);
  const [expression, setExpression] = useState('');

  const handleKeyClick = (key) => {
    if (key === 'AC') {
      onChange('0');
      setExpression('');
      return;
    }

    if (key === 'DEL') {
      const currentStr = String(value || '');
      if (currentStr.length <= 1 || currentStr === '0') {
        onChange('0');
      } else {
        onChange(currentStr.slice(0, -1));
      }
      return;
    }

    if (key === 'M+') {
      const currentNum = parseFloat(value) || 0;
      setMemory((prev) => prev + currentNum);
      return;
    }

    if (key === 'M-') {
      const currentNum = parseFloat(value) || 0;
      setMemory((prev) => prev - currentNum);
      return;
    }

    if (key === '=') {
      try {
        if (expression) {
          const fullExpr = expression + (value || '0');
          // Safe arithmetic evaluation without dangerous eval
          const sanitized = fullExpr.replace(/×/g, '*').replace(/÷/g, '/');
          // Only permit safe characters: numbers and operators
          if (/^[0-9+\-*/. ]+$/.test(sanitized)) {
            // eslint-disable-next-line no-new-func
            const result = Function(`'use strict'; return (${sanitized})`)();
            onChange(String(Math.round(result * 100) / 100));
            setExpression('');
          }
        }
      } catch (err) {
        console.warn('Calculation error:', err);
      }
      return;
    }

    if (['+', '-', '×', '÷', '%'].includes(key)) {
      if (key === '%') {
        const currentNum = parseFloat(value) || 0;
        onChange(String(currentNum / 100));
        return;
      }
      setExpression((value || '0') + ` ${key} `);
      onChange('0');
      return;
    }

    if (key === 'DONE') {
      if (onDone) onDone();
      return;
    }

    // Number or decimal point input
    const currentStr = String(value === '0' || !value ? '' : value);
    if (key === '.') {
      if (!currentStr.includes('.')) {
        onChange((currentStr || '0') + '.');
      }
      return;
    }

    // Append digit
    const updated = currentStr + key;
    onChange(updated);
  };

  const keyRows = [
    [
      { label: 'AC', key: 'AC', className: 'bg-slate-200 text-slate-800 font-semibold' },
      { label: 'M+', key: 'M+', className: 'bg-slate-200 text-slate-700' },
      { label: 'M-', key: 'M-', className: 'bg-slate-200 text-slate-700' },
      { label: <Delete className="w-5 h-5 mx-auto" />, key: 'DEL', className: 'bg-slate-200 text-slate-800' },
    ],
    [
      { label: '%', key: '%', className: 'bg-slate-100 text-slate-700 text-lg' },
      { label: '÷', key: '÷', className: 'bg-slate-100 text-slate-700 text-xl font-medium' },
      { label: '×', key: '×', className: 'bg-slate-100 text-slate-700 text-xl font-medium' },
      { label: '-', key: '-', className: 'bg-slate-100 text-slate-700 text-2xl font-light' },
    ],
    [
      { label: '7', key: '7', className: 'bg-white text-slate-900 font-medium' },
      { label: '8', key: '8', className: 'bg-white text-slate-900 font-medium' },
      { label: '9', key: '9', className: 'bg-white text-slate-900 font-medium' },
      { label: '+', key: '+', className: 'bg-slate-100 text-slate-700 text-xl' },
    ],
    [
      { label: '4', key: '4', className: 'bg-white text-slate-900 font-medium' },
      { label: '5', key: '5', className: 'bg-white text-slate-900 font-medium' },
      { label: '6', key: '6', className: 'bg-white text-slate-900 font-medium' },
      { label: '=', key: '=', className: 'bg-slate-100 text-slate-700 text-xl font-bold' },
    ],
    [
      { label: '1', key: '1', className: 'bg-white text-slate-900 font-medium' },
      { label: '2', key: '2', className: 'bg-white text-slate-900 font-medium' },
      { label: '3', key: '3', className: 'bg-white text-slate-900 font-medium' },
      { label: <ArrowRight className="w-5 h-5 mx-auto text-slate-800" />, key: 'DONE', className: 'bg-slate-200' },
    ],
    [
      { label: '0', key: '0', colSpan: 3, className: 'bg-white text-slate-900 font-medium' },
      { label: '.', key: '.', className: 'bg-white text-slate-900 font-bold text-xl' },
    ],
  ];

  return (
    <div className="w-full bg-slate-100 p-2 rounded-2xl select-none mt-2 shadow-inner border border-slate-200/80">
      {expression && (
        <div className="text-right text-xs font-mono text-slate-500 px-3 py-1 bg-white/60 rounded-md mb-1.5">
          {expression}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {keyRows.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-4 gap-1.5">
            {row.map((item, colIdx) => (
              <button
                type="button"
                key={colIdx}
                onClick={() => handleKeyClick(item.key)}
                className={`h-11 md:h-12 flex items-center justify-center rounded-xl text-base shadow-xs active:scale-95 transition-transform duration-75 cursor-pointer touch-target ${
                  item.colSpan === 3 ? 'col-span-3' : 'col-span-1'
                } ${item.className}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
