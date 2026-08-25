import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export const MigrationView = ({ connection }) => {
    const [step, setStep] = useState(1);
    const [sourceProject, setSourceProject] = useState('');
    const [destProject, setDestProject] = useState('');
    const [dataType, setDataType] = useState('collection');
    const [collectionPath, setCollectionPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
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
        if (step < steps.length)
            setStep(step + 1);
    };
    const handlePrev = () => {
        if (step > 1)
            setStep(step - 1);
    };
    const handleExecute = async () => {
        setLoading(true);
        try {
            // In real implementation, call migration service
            setResult({ success: true, processed: 100, succeeded: 98, failed: 2 });
            setStep(8);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', padding: 16 }, children: [_jsx("h2", { style: { marginBottom: 8 }, children: "Migration Wizard" }), _jsx("div", { style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }, children: steps.map((s, i) => (_jsxs("span", { style: {
                        padding: '4px 12px',
                        borderRadius: 12,
                        backgroundColor: i + 1 < step ? 'var(--vscode-accent)' : i + 1 === step ? 'var(--vscode-button-background)' : 'var(--vscode-input-bg)',
                        color: i + 1 <= step ? 'white' : 'var(--vscode-descriptionForeground)',
                        fontSize: 12,
                        fontWeight: i + 1 === step ? 600 : 400,
                    }, children: [i + 1, ". ", s] }, i))) }), _jsxs("div", { style: { flex: 1, overflow: 'auto' }, children: [step === 1 && (_jsxs("div", { children: [_jsx("h3", { children: "Select Source Project" }), _jsxs("select", { value: sourceProject, onChange: e => setSourceProject(e.target.value), style: { width: '100%', maxWidth: 300, marginBottom: 16 }, children: [_jsx("option", { value: "", children: "Select source..." }), _jsxs("option", { value: connection.projectId, children: [connection.displayName, " (current)"] })] }), _jsx("button", { onClick: handleNext, disabled: !sourceProject, children: "Next" })] })), step === 2 && (_jsxs("div", { children: [_jsx("h3", { children: "Select Destination Project" }), _jsx("div", { style: { color: 'var(--vscode-warning)', marginBottom: 16, padding: 12, backgroundColor: 'rgba(220, 220, 170, 0.1)', borderRadius: 4 }, children: "\u26A0\uFE0F Select destination carefully. This is where data will be written." }), _jsxs("select", { value: destProject, onChange: e => setDestProject(e.target.value), style: { width: '100%', maxWidth: 300, marginBottom: 16 }, children: [_jsx("option", { value: "", children: "Select destination..." }), _jsxs("option", { value: connection.projectId, children: [connection.displayName, " (current)"] })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handlePrev, className: "secondary", children: "Back" }), _jsx("button", { onClick: handleNext, disabled: !destProject, children: "Next" })] })] })), step === 3 && (_jsxs("div", { children: [_jsx("h3", { children: "Select Data to Migrate" }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsx("input", { type: "radio", name: "dataType", value: "collection", checked: dataType === 'collection', onChange: () => setDataType('collection') }), _jsx("span", { children: "Entire Collection" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }, children: [_jsx("input", { type: "radio", name: "dataType", value: "query", checked: dataType === 'query', onChange: () => setDataType('query') }), _jsx("span", { children: "Query Results" })] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("input", { type: "radio", name: "dataType", value: "documents", checked: dataType === 'documents', onChange: () => setDataType('documents') }), _jsx("span", { children: "Selected Documents" })] })] }), dataType === 'collection' && (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: { display: 'block', marginBottom: 4 }, children: "Collection Path" }), _jsx("input", { type: "text", value: collectionPath, onChange: e => setCollectionPath(e.target.value), placeholder: "users", style: { width: '100%', maxWidth: 300 } })] })), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handlePrev, className: "secondary", children: "Back" }), _jsx("button", { onClick: handleNext, disabled: !collectionPath && dataType === 'collection', children: "Next" })] })] })), step === 4 && (_jsxs("div", { children: [_jsx("h3", { children: "Preview Migration" }), _jsxs("div", { style: { marginBottom: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }, children: [_jsx("strong", { children: "Source:" }), " ", sourceProject, _jsx("br", {}), _jsx("strong", { children: "Destination:" }), " ", destProject, _jsx("br", {}), _jsx("strong", { children: "Data:" }), " ", dataType, " - ", collectionPath || 'query'] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handlePrev, className: "secondary", children: "Back" }), _jsx("button", { onClick: handleNext, children: "Next" })] })] })), step === 5 && (_jsxs("div", { children: [_jsx("h3", { children: "Review Changes" }), _jsxs("div", { style: { marginBottom: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }, children: [_jsx("strong", { children: "Changes will be applied to:" }), " ", destProject, _jsxs("ul", { style: { marginTop: 8 }, children: [_jsxs("li", { children: ["Collection: ", collectionPath] }), _jsx("li", { children: "Estimated documents: ~100" }), _jsx("li", { children: "Estimated writes: ~100" })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handlePrev, className: "secondary", children: "Back" }), _jsx("button", { onClick: handleNext, children: "Next" })] })] })), step === 6 && (_jsxs("div", { children: [_jsx("h3", { children: "Confirm Migration" }), _jsxs("div", { style: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(244, 71, 71, 0.1)', border: '1px solid var(--vscode-error)', borderRadius: 4 }, children: [_jsxs("strong", { style: { color: 'var(--vscode-error)' }, children: ["\u26A0\uFE0F This will write data to ", destProject] }), _jsx("p", { style: { marginTop: 8 }, children: "This operation cannot be easily undone. Please verify all settings above." })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { onClick: handlePrev, className: "secondary", children: "Back" }), _jsx("button", { onClick: handleNext, className: "danger", children: "Confirm & Execute" })] })] })), step === 7 && (_jsxs("div", { children: [_jsx("h3", { children: "Executing Migration" }), _jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("div", { className: "progress-bar", style: { height: 8 }, children: _jsx("div", { className: "progress-fill", style: { width: loading ? '100%' : '0%' } }) }), _jsx("div", { style: { marginTop: 8 }, children: "Migrating documents..." })] }), loading && _jsx("div", { children: "Processing..." }), !loading && result && (_jsxs("div", { style: { marginTop: 16, padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }, children: [_jsx("strong", { children: "Complete!" }), _jsxs("ul", { style: { marginTop: 8 }, children: [_jsxs("li", { children: ["Processed: ", result.processed] }), _jsxs("li", { children: ["Succeeded: ", result.succeeded] }), _jsxs("li", { children: ["Failed: ", result.failed] })] })] })), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 16 }, children: [_jsx("button", { onClick: handlePrev, className: "secondary", disabled: loading, children: "Back" }), !loading && !result && _jsx("button", { onClick: handleExecute, disabled: loading, className: "danger", children: "Execute" }), result && _jsx("button", { onClick: handleNext, disabled: loading, children: "View Results" })] })] })), step === 8 && (_jsxs("div", { children: [_jsx("h3", { children: "Migration Results" }), result && (_jsxs("div", { style: { padding: 12, backgroundColor: 'var(--vscode-input-bg)', borderRadius: 4 }, children: [_jsxs("strong", { children: ["Migration ", result.success ? 'Succeeded' : 'Completed with Errors'] }), _jsxs("ul", { style: { marginTop: 8 }, children: [_jsxs("li", { children: ["Total Processed: ", result.processed] }), _jsxs("li", { children: ["Succeeded: ", result.succeeded] }), _jsxs("li", { children: ["Failed: ", result.failed] })] })] })), _jsx("div", { style: { display: 'flex', gap: 8, marginTop: 16 }, children: _jsx("button", { onClick: () => setStep(1), className: "secondary", children: "New Migration" }) })] }))] })] }));
};
//# sourceMappingURL=MigrationView.js.map