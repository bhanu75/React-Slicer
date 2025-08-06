import React, { useState, useRef } from 'react';
import { Upload, FileText, Settings, Download, Rocket, BookOpen, Copy, Check, Trash2, RefreshCw } from 'lucide-react';

export default function ReactModularizer() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState({ text: 'Ready to process', type: 'ready' });
  const [activeTab, setActiveTab] = useState('updated-app');
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [copiedStates, setCopiedStates] = useState({});
  const fileInputRef = useRef(null);

  const exampleCode = `import React, { useState } from 'react';

// Header component - will be extracted
function Header() {
  return (
    <header className="app-header">
      <h1>🚀 My Awesome Dashboard</h1>
      <nav>
        <button>Home</button>
        <button>About</button>
        <button>Contact</button>
      </nav>
    </header>
  );
}

// Sidebar component - will be extracted
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <aside className={\`sidebar \${isOpen ? 'open' : 'closed'}\`}>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '❌ Close' : '☰ Menu'}
      </button>
      {isOpen && (
        <ul>
          <li>📊 Dashboard</li>
          <li>⚙️ Settings</li>
          <li>👤 Profile</li>
        </ul>
      )}
    </aside>
  );
};

// UserCard component - will be extracted
function UserCard({ user }) {
  return (
    <div className="user-card">
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span className="role">{user.role}</span>
    </div>
  );
}

// Main App component - will stay here
function App() {
  const [users] = useState([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Admin',
      avatar: 'https://via.placeholder.com/50'
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com', 
      role: 'User',
      avatar: 'https://via.placeholder.com/50'
    }
  ]);

  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main className="content">
          <h2>👥 User Management</h2>
          <div className="users-grid">
            {users.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;`;

  const updateStatus = (text, type) => {
    setStatus({ text, type });
  };

  const updateProgress = (percentage, message) => {
    setProgress(percentage);
    updateStatus(message, 'processing');
    return new Promise(resolve => setTimeout(resolve, 300));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
        updateStatus('File loaded successfully', 'success');
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target.result);
        updateStatus('File loaded successfully', 'success');
      };
      reader.readAsText(file);
    }
  };

  const loadExample = () => {
    setCode(exampleCode);
    updateStatus('Example loaded', 'success');
  };

  const clearInput = () => {
    setCode('');
    updateStatus('Input cleared', 'success');
  };

  const processCode = async () => {
    if (!code.trim()) {
      updateStatus('Please provide App.jsx content', 'error');
      return;
    }

    setProcessing(true);
    setProgress(0);
    
    try {
      await updateProgress(25, 'Parsing AST...');
      await updateProgress(50, 'Extracting components...');
      await updateProgress(75, 'Generating files...');
      
      const response = await fetch('/api/modularize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      await updateProgress(100, 'Complete!');
      setResults(result);
      updateStatus(`Extracted ${result.components.length} components`, 'success');
      
    } catch (error) {
      updateStatus('Processing failed: ' + error.message, 'error');
      console.error('Processing error:', error);
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      updateStatus('Copied to clipboard', 'success');
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      updateStatus('Copy failed', 'error');
    }
  };

  const generateFileStructure = (components) => {
    let structure = `your-nextjs-project/\n├── pages/\n│   ├── _app.js             // Next.js app wrapper\n│   ├── index.js            // Homepage\n│   └── api/\n│       └── modularize.js   // API endpoint\n├── components/             // Generated components\n`;
    
    components.forEach((component, index) => {
      const isLast = index === components.length - 1;
      const prefix = isLast ? '└──' : '├──';
      structure += `│   ${prefix} ${component.filename}\n`;
    });
    
    structure += `├── styles/\n│   └── globals.css         // Global styles\n├── package.json           // Project dependencies\n└── next.config.js         // Next.js config\n\n📊 Summary:\n• ${components.length} components extracted\n• ${components.length + 1} files created\n• Next.js compatible structure\n• Ready for production deployment`;
    
    return structure;
  };

  const downloadResults = () => {
    if (!results) {
      updateStatus('No results to download', 'error');
      return;
    }

    const zip = {
      'pages/index.js': results.updatedApp,
      'components': {}
    };

    results.components.forEach(component => {
      zip.components[`${component.name}.jsx`] = component.code;
    });

    const dataStr = JSON.stringify(zip, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nextjs-modularized-components.json';
    link.click();
    
    URL.revokeObjectURL(url);
    updateStatus('Results downloaded', 'success');
  };

  const showDocumentation = () => {
    alert(`Next.js React Component Modularizer - Professional Tool

🎯 Purpose:
Extract React components from monolithic Next.js pages into separate, maintainable files.

⚡ Features:
• AST-based parsing for accuracy
• Next.js compatible structure
• Support for function & arrow components
• Auto-generated import statements
• Professional code formatting
• Instant preview & download

🚀 Usage:
1. Upload or paste your Next.js page content
2. Click "Modularize" to process
3. Review extracted components
4. Download or copy results

📁 Next.js Structure:
• Components go in /components/ folder
• Pages use Next.js routing conventions
• API endpoints in /pages/api/
• Compatible with App Router & Pages Router

Built for Next.js developers who value clean, maintainable code architecture.`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-xl font-bold">
                ⚡
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Next.js Modularizer
              </h1>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={showDocumentation}
                className="flex items-center gap-2 px-4 py-2 border border-slate-600 rounded-md bg-slate-800 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 hover:-translate-y-0.5"
              >
                <BookOpen size={16} />
                Docs
              </button>
              <button 
                onClick={downloadResults}
                className="flex items-center gap-2 px-4 py-2 border border-slate-600 rounded-md bg-slate-800 hover:bg-blue-600 hover:border-blue-600 transition-all duration-200 hover:-translate-y-0.5"
              >
                <Download size={16} />
                Download
              </button>
              <button 
                onClick={processCode}
                disabled={processing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
              >
                {processing ? <RefreshCw size={16} className="animate-spin" /> : <Rocket size={16} />}
                Modularize
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-5 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText size={20} />
              Input Source
            </h2>
            
            {/* File Upload Area */}
            <div 
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center mb-5 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} className="mx-auto mb-4 text-slate-400" />
              <div className="text-slate-300 mb-2">Drop Next.js page file here or click to upload</div>
              <div className="text-sm text-slate-500">Supports React .jsx, .js, and Next.js page files</div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".jsx,.js"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-48 p-4 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 font-mono text-sm leading-6 resize-y focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              placeholder="// Paste your Next.js page content here
import React, { useState } from 'react';

function Header() {
  return <header><h1>My Next.js App</h1></header>;
}

const Sidebar = () => {
  return <aside>Sidebar</aside>;
};

export default function Home() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  );
}"
            />

            <div className="mt-4 flex gap-3">
              <button 
                onClick={loadExample}
                className="flex items-center gap-2 px-4 py-2 border border-slate-600 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <FileText size={16} />
                Load Example
              </button>
              <button 
                onClick={clearInput}
                className="flex items-center gap-2 px-4 py-2 border border-slate-600 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings size={20} />
              Results
            </h2>
            
            {/* Status Bar */}
            <div className="flex items-center justify-between mb-5 p-3 bg-slate-900 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className={`w-2 h-2 rounded-full ${
                  status.type === 'success' ? 'bg-green-500' :
                  status.type === 'processing' ? 'bg-yellow-500 animate-pulse' :
                  status.type === 'error' ? 'bg-red-500' : 'bg-slate-500'
                }`} />
                <span>{status.text}</span>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span>Components: {results?.components?.length || 0}</span>
                <span>Files: {results ? (results.components?.length || 0) + 1 : 0}</span>
                <span>Time: {results?.processingTime || 0}ms</span>
              </div>
            </div>

            {/* Progress Bar */}
            {progress > 0 && (
              <div className="w-full h-1 bg-slate-700 rounded-full mb-5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-700 mb-5">
              {[
                { id: 'updated-app', label: '📄 Updated Page' },
                { id: 'components', label: '🧩 Components' },
                { id: 'structure', label: '🏗️ File Structure' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'updated-app' && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700">
                    <span className="text-sm font-medium">pages/index.js</span>
                    <button
                      onClick={() => copyToClipboard(results?.updatedApp || '// Processed Next.js page will appear here', 'updatedApp')}
                      className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-600 rounded hover:bg-blue-600 hover:border-blue-600 transition-colors"
                    >
                      {copiedStates.updatedApp ? <Check size={14} /> : <Copy size={14} />}
                      {copiedStates.updatedApp ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">
                      {results?.updatedApp || '// Processed Next.js page will appear here'}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'components' && (
                <div className="space-y-4">
                  {results?.components?.map((component) => (
                    <div key={component.name} className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700">
                        <span className="text-sm font-medium">components/{component.filename}</span>
                        <button
                          onClick={() => copyToClipboard(component.code, `component-${component.name}`)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-600 rounded hover:bg-blue-600 hover:border-blue-600 transition-colors"
                        >
                          {copiedStates[`component-${component.name}`] ? <Check size={14} /> : <Copy size={14} />}
                          {copiedStates[`component-${component.name}`] ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">
                          {component.code}
                        </pre>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-slate-400">
                      No components extracted yet. Process your Next.js code to see results.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'structure' && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 border-b border-slate-700">
                    <span className="text-sm font-medium">Next.js Project Structure</span>
                    <button
                      onClick={() => copyToClipboard(results ? generateFileStructure(results.components) : '// Next.js file structure will appear here', 'structure')}
                      className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-600 rounded hover:bg-blue-600 hover:border-blue-600 transition-colors"
                    >
                      {copiedStates.structure ? <Check size={14} /> : <Copy size={14} />}
                      {copiedStates.structure ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm font-mono text-slate-300 whitespace-pre-wrap">
                      {results ? generateFileStructure(results.components) : '// Next.js file structure will appear here'}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-5 text-center text-sm text-slate-400">
        <div className="max-w-7xl mx-auto px-5">
          <p>Professional Next.js Component Modularizer - Built for Enterprise Development Teams</p>
        </div>
      </footer>
    </div>
  );
}
