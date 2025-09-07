import React, { useEffect, useMemo, useState } from 'react';

// Utility: detect a likely delimiter from a few sample lines
function detectDelimiter(lines) {
  const candidates = [',', '\t', ';', '|'];
  const scores = candidates.map((c) => {
    let total = 0;
    const sample = lines.slice(0, 5);
    sample.forEach((ln) => {
      total += (ln.match(new RegExp(escapeRegExp(c), 'g')) || []).length;
    });
    return total;
  });
  const max = Math.max(...scores);
  const idx = scores.indexOf(max);
  return max > 0 ? candidates[idx] : ','; // default to comma
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitLine(line, delim) {
  // Simple split, trim quotes/spaces
  return line
    .split(delim)
    .map((c) => c.replace(/^\s*"?|"?\s*$/g, '').trim());
}

function isNumericLike(value) {
  if (value === null || value === undefined) return false;
  const v = String(value).trim();
  if (v === '') return false;
  const n = Number(v);
  return Number.isFinite(n);
}

const WizardStep3 = ({ onUpdate, onBack, fileName, fileContent }) => {
  const [delimiter, setDelimiter] = useState('auto');
  const [hasHeader, setHasHeader] = useState(true);
  const [xIndex, setXIndex] = useState(0);
  const [yIndex, setYIndex] = useState(1);
  const [rowStart, setRowStart] = useState(1);
  const [rowEnd, setRowEnd] = useState(100);
  const [attributes, setAttributes] = useState('');
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);


  const lines = useMemo(() => {
    if (!fileContent) return [];
    const raw = fileContent
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l && !l.startsWith('#'));
    return raw;
  }, [fileContent]);

  const usedDelimiter = useMemo(() => {
    if (delimiter !== 'auto') return delimiter;
    return detectDelimiter(lines);
  }, [delimiter, lines]);

  const table = useMemo(() => {
    if (!lines.length) return { headers: [], rows: [] };
    const headerLine = lines[0];
    const firstRow = splitLine(headerLine, usedDelimiter);
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows = dataLines.map((ln) => splitLine(ln, usedDelimiter));
    const colCount = Math.max(firstRow.length, ...rows.map((r) => r.length));
    const headers = hasHeader
      ? firstRow.map((h, i) => h || `Column ${i + 1}`)
      : Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`);
    return { headers, rows };
  }, [lines, usedDelimiter, hasHeader]);

  // Auto-detect best X and Y columns and auto-advance if valid
  useEffect(() => {
    setIsInitializing(true);
    if (table.headers.length > 0 && table.rows.length > 0) {
      let bestX = 0;
      let bestY = table.headers.length > 1 ? 1 : 0;

      for (let i = 0; i < table.headers.length; i++) {
        if (table.rows.some(row => isNumericLike(row[i]))) {
          bestY = i;
          break;
        }
      }

      if (bestX === bestY) {
        bestY = (bestY + 1) % table.headers.length;
      }

      setXIndex(bestX);
      setYIndex(bestY);
      setRowStart(1);
      setRowEnd(Math.min(100, table.rows.length));
      setIsInitializing(false);
    } else {
      setIsInitializing(fileContent ? true : false);
    }
  }, [table.headers, table.rows, fileContent]);

  const previewRows = useMemo(() => table.rows.slice(0, 50), [table.rows]);

  const handleApply = (e) => {
    e.preventDefault();
    setError('');
    console.log('[WizardStep3] Apply clicked', {
      fileName,
      hasHeader,
      delimiter: usedDelimiter,
      xIndex,
      yIndex,
      rowStart,
      rowEnd,
      totalRows: table.rows.length,
      headers: table.headers,
    });
    if (!table.rows.length || table.headers.length < 2) {
      setError('Not enough columns/rows to build a chart.');
      return;
    }
    if (xIndex === null || yIndex === null) {
      setError('Please select both X and Y columns.');
      return;
    }

    const start = Math.max(1, Math.min(rowStart || 1, table.rows.length));
    const end = Math.max(start, Math.min(rowEnd || table.rows.length, table.rows.length));
    const slice = table.rows.slice(start - 1, end);

    const x = [];
    const y = [];
    slice.forEach((r) => {
      const xv = r[xIndex] ?? '';
      const yv = r[yIndex] ?? '';
      const yNum = Number(yv);
      if (Number.isFinite(yNum)) {
        x.push(xv);
        y.push(yNum);
      }
    });

    if (!x.length || !y.length) {
      setError('Selected Y column has no numeric values in the chosen range.');
      return;
    }

    const payload = {
      data: { x, y },
      config: {
        attributes,
        selectedColumns: {
          x: table.headers[xIndex],
          y: table.headers[yIndex],
        },
        hasHeader,
        delimiter: usedDelimiter,
        rowRange: [start, end],
        fileName: fileName || '',
      },
    };
    console.log('[WizardStep3] onUpdate payload ->', payload);
    onUpdate(payload);
  };

  return (
    <div className="wizard-step">
      <h3>Step 3: Configure Data Selection</h3>
      {fileName && (
        <div className="file-types-info">Using file: <strong>{fileName}</strong></div>
      )}
      {!fileContent && (
        <div className="error-message">No file content available. Go back and upload a file.</div>
      )}

      <form id="wizard-step3-form" onSubmit={handleApply}>
        {fileContent && (
          <>
            <div className="column-picker">
              <label>
                Delimiter
                <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                  <option value="auto">Auto-detect ({usedDelimiter === '\t' ? 'Tab' : usedDelimiter})</option>
                  <option value=",">Comma (,)</option>
                  <option value="\t">Tab (\t)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </label>
              <label>
                Header row present
                <select value={hasHeader ? 'yes' : 'no'} onChange={(e) => setHasHeader(e.target.value === 'yes')}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label>
                X column
                <select value={xIndex} onChange={(e) => setXIndex(Number(e.target.value))}>
                  {table.headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </label>
              <label>
                Y column (numeric)
                <select value={yIndex} onChange={(e) => setYIndex(Number(e.target.value))}>
                  {table.headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </label>
              <label>
                Row start (1-based)
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, table.rows.length)}
                  value={rowStart}
                  onChange={(e) => setRowStart(Number(e.target.value))}
                />
              </label>
              <label>
                Row end
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, table.rows.length)}
                  value={rowEnd}
                  onChange={(e) => setRowEnd(Number(e.target.value))}
                />
              </label>
              <label>
                Attributes (optional)
                <input
                  type="text"
                  value={attributes}
                  onChange={(e) => setAttributes(e.target.value)}
                  placeholder="e.g., gene, variant"
                />
              </label>
            </div>

            {table.headers.length > 0 && (
              <div className="preview-table-wrapper">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {table.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, idx) => (
                      <tr key={idx}>
                        {table.headers.map((_, ci) => (
                          <td key={ci}>{r[ci] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </form>

      {error && <div className="error-message">{error}</div>}

      <div className="nav-buttons">
        <button onClick={onBack}>Back</button>
        <button type="submit" form="wizard-step3-form" className="primary" disabled={isInitializing}>
          {isInitializing ? 'Analyzing...' : 'Apply & Next'}
        </button>
      </div>
    </div>
  );
};

export default WizardStep3;