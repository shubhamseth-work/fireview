import React, { useState } from 'react';
import { Connection } from '@fireview/core';

interface ProjectCompareViewProps {
  connection: Connection;
}

export const ProjectCompareView: React.FC<ProjectCompareViewProps> = ({ connection }) => {
  const [sourceProject, setSourceProject] = useState('');
  const [destProject, setDestProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<any>(null);

  const handleCompare = async () => {
    if (!sourceProject || !destProject) return;
    setLoading(true);
    try {
      // In real implementation, call backend
      setComparison({
        collections: [],
        summary: { totalCollections: 0, matchingCollections: 0, missingInSource: 0, missingInDestination: 0, structureDifferences: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>Project Comparison</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>Source Project</label>
          <select value={sourceProject} onChange={e => setSourceProject(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select source...</option>
            <option value={connection.projectId}>{connection.displayName} (current)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>Destination Project</label>
          <select value={destProject} onChange={e => setDestProject(e.target.value)} style={{ width: '100%' }}>
            <option value="">Select destination...</option>
            <option value={connection.projectId}>{connection.displayName} (current)</option>
          </select>
        </div>
      </div>

      <button onClick={handleCompare} disabled={!sourceProject || !destProject || loading} style={{ width: 'fit-content' }}>
        {loading ? 'Comparing...' : 'Compare Projects'}
      </button>

      {comparison && (
        <div style={{ marginTop: 16, flex: 1, overflow: 'auto' }}>
          <h3>Comparison Results</h3>
          <div style={{ marginBottom: 16 }}>
            <strong>Summary:</strong>
            <ul style={{ marginTop: 8 }}>
              <li>Total Collections: {comparison.summary.totalCollections}</li>
              <li>Matching: {comparison.summary.matchingCollections}</li>
              <li>Missing in Source: {comparison.summary.missingInSource}</li>
              <li>Missing in Destination: {comparison.summary.missingInDestination}</li>
              <li>Structure Differences: {comparison.summary.structureDifferences}</li>
            </ul>
          </div>
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(comparison, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};