import React, { useState } from 'react';
import { Connection } from '@vistiq/core';

interface MigrationViewProps {
  connection: Connection;
}

export const MigrationView: React.FC<MigrationViewProps> = ({ connection }) => {
  const [step, setStep] = useState(1);
  const [sourceProject, setSourceProject] = useState('');
  const [destProject, setDestProject] = useState('');
  const [dataType, setDataType] = useState<'collection' | 'query' | 'documents'>('collection');
  const [collectionPath, setCollectionPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const steps = [
    'Select Source',
    'Select Destination',
    'Select Data',
    'Preview',
    'Review Changes',
    'Confirm',
    'Execute',
    'Results',
  ];

  const handleNext = () => {
    if (step < steps.length) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      // In real implementation, call migration service
      setResult({ success: true, processed: 100, succeeded: 98, failed: 2 });
      setStep(8);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>Migration Wizard</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {steps.map((s, i) => (
          <span
            key={i}
            style={{
              padding: '4px 12px',
              borderRadius: 12,
              backgroundColor: i + 1 < step ? 'var(--vscode-accent)' : i + 1 === step ? 'var(--vscode-button-background)' : 'var(--vscode-input-bg)',
              color: i + 1 <= step ? 'white' : 'var(--vscode-descriptionForeground)',
              fontSize: 12,
              fontWeight: i + 1 === step ? 600 : 400,
            }}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {step === 1 && (
          <div>
            <h3>Select Source Project</h3>
            <select value={sourceProject} onChange={e => setSourceProject(e.target.value)} style={{ width: '100%', maxWidth: 300, marginBottom: 16 }}>
              <option value="">Select source...</option>
              <option value={connection.projectId}>{connection.displayName} (current)</option>
            </select>
            <button onClick={handleNext} disabled={!sourceProject}>Next</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Select Destination Project</h3>
            <div style={{ color: 'var(--vscode-warning)', marginBottom: 16, padding: 12, backgroundColor: 'rgba(220, 220, 170, 0.1)', borderRadius: 4 }}>
              ⚠️ Select destination carefully. This is where data will be written.
            </div>
            <select value={destProject} onChange={e => setDestProject(e.target.value)} style={{ width: '100%', maxWidth: 300, marginBottom: 16 }}>
              <option value="">Select destination...</option>
              <option value={connection.projectId}>{connection.displayName} (current)</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrev} className="secondary">Back</button>
              <button onClick={handleNext} disabled={!destProject}>Next</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>Select Data to Migrate</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input type="radio" name="dataType" value="collection" checked={dataType === 'collection'} onChange={() => setDataType('collection')} />
                <span>Entire Collection</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <input type="radio" name="dataType" value="query" checked={dataType === 'query'} onChange={() => setDataType('query')} />
                <span>Query Results</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="radio" name="dataType" value="documents" checked={dataType === 'documents'} onChange={() => setDataType('documents')} />
                <span>Selected Documents</span>
              </label>
            </div>
            {dataType === 'collection' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Collection Path</label>
                <input type="text" value={collectionPath} onChange={e => setCollectionPath(e.target.value)} placeholder="users" style={{ width: '100%', maxWidth: 300 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrev} className="secondary">Back</button>
              <button onClick={handleNext} disabled={!collectionPath && dataType === 'collection'}>Next</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3>Preview Migration</h3>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }}>
              <strong>Source:</strong> {sourceProject}<br />
              <strong>Destination:</strong> {destProject}<br />
              <strong>Data:</strong> {dataType} - {collectionPath || 'query'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrev} className="secondary">Back</button>
              <button onClick={handleNext}>Next</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3>Review Changes</h3>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }}>
              <strong>Changes will be applied to:</strong> {destProject}
              <ul style={{ marginTop: 8 }}>
                <li>Collection: {collectionPath}</li>
                <li>Estimated documents: ~100</li>
                <li>Estimated writes: ~100</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrev} className="secondary">Back</button>
              <button onClick={handleNext}>Next</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3>Confirm Migration</h3>
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(244, 71, 71, 0.1)', border: '1px solid var(--vscode-error)', borderRadius: 4 }}>
              <strong style={{ color: 'var(--vscode-error)' }}>⚠️ This will write data to {destProject}</strong>
              <p style={{ marginTop: 8 }}>This operation cannot be easily undone. Please verify all settings above.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePrev} className="secondary">Back</button>
              <button onClick={handleNext} className="danger">Confirm & Execute</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h3>Executing Migration</h3>
            <div style={{ marginBottom: 16 }}>
              <div className="progress-bar" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: loading ? '100%' : '0%' }}></div>
              </div>
              <div style={{ marginTop: 8 }}>Migrating documents...</div>
            </div>
            {loading && <div>Processing...</div>}
            {!loading && result && (
              <div style={{ marginTop: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }}>
                <strong>Complete!</strong>
                <ul style={{ marginTop: 8 }}>
                  <li>Processed: {result.processed}</li>
                  <li>Succeeded: {result.succeeded}</li>
                  <li>Failed: {result.failed}</li>
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handlePrev} className="secondary" disabled={loading}>Back</button>
              {!loading && !result && <button onClick={handleExecute} disabled={loading} className="danger">Execute</button>}
              {result && <button onClick={handleNext} disabled={loading}>View Results</button>}
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h3>Migration Results</h3>
            {result && (
              <div style={{ padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }}>
                <strong>Migration {result.success ? 'Succeeded' : 'Completed with Errors'}</strong>
                <ul style={{ marginTop: 8 }}>
                  <li>Total Processed: {result.processed}</li>
                  <li>Succeeded: {result.succeeded}</li>
                  <li>Failed: {result.failed}</li>
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setStep(1)} className="secondary">New Migration</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};