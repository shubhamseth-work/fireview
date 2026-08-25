import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const ProjectCompareView = ({ connection }) => {
    const [sourceProject, setSourceProject] = useState('');
    const [destProject, setDestProject] = useState('');
    const [loading, setLoading] = useState(false);
    const [comparison, setComparison] = useState(null);
    const handleCompare = async () => {
        if (!sourceProject || !destProject)
            return;
        setLoading(true);
        try {
            // In real implementation, call backend
            setComparison({
                collections: [],
                summary: { totalCollections: 0, matchingCollections: 0, missingInSource: 0, missingInDestination: 0, structureDifferences: 0 }
            });
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }, children: [_jsx("h2", { style: { marginBottom: 16 }, children: "Project Comparison" }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: 8 }, children: "Source Project" }), _jsxs("select", { value: sourceProject, onChange: e => setSourceProject(e.target.value), style: { width: '100%' }, children: [_jsx("option", { value: "", children: "Select source..." }), _jsxs("option", { value: connection.projectId, children: [connection.displayName, " (current)"] })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: 8 }, children: "Destination Project" }), _jsxs("select", { value: destProject, onChange: e => setDestProject(e.target.value), style: { width: '100%' }, children: [_jsx("option", { value: "", children: "Select destination..." }), _jsxs("option", { value: connection.projectId, children: [connection.displayName, " (current)"] })] })] })] }), _jsx("button", { onClick: handleCompare, disabled: !sourceProject || !destProject || loading, style: { width: 'fit-content' }, children: loading ? 'Comparing...' : 'Compare Projects' }), comparison && (_jsxs("div", { style: { marginTop: 16, flex: 1, overflow: 'auto' }, children: [_jsx("h3", { children: "Comparison Results" }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("strong", { children: "Summary:" }), _jsxs("ul", { style: { marginTop: 8 }, children: [_jsxs("li", { children: ["Total Collections: ", comparison.summary.totalCollections] }), _jsxs("li", { children: ["Matching: ", comparison.summary.matchingCollections] }), _jsxs("li", { children: ["Missing in Source: ", comparison.summary.missingInSource] }), _jsxs("li", { children: ["Missing in Destination: ", comparison.summary.missingInDestination] }), _jsxs("li", { children: ["Structure Differences: ", comparison.summary.structureDifferences] })] })] }), _jsx("pre", { style: { fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }, children: JSON.stringify(comparison, null, 2) })] }))] }));
};
//# sourceMappingURL=ProjectCompareView.js.map