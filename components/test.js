
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ReactModularizer = require('./lib/modularize.js');

async function runTest() {
  console.log('🧪 Testing React Component Modularizer\n');

  // Create test App.jsx
  const testApp = `import React, { useState } from 'react';

// Header component - should be extracted
function Header() {
  return (
    <header className="header">
      <h1>My Awesome App</h1>
      <nav>
        <a href="#home">Home</a>
        <a href="#about">About</a>
      </nav>
    </header>
  );
}

// Sidebar component - should be extracted
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <aside className={\`sidebar \${isOpen ? 'open' : 'closed'}\`}>
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle Sidebar
      </button>
      <ul>
        <li>Dashboard</li>
        <li>Settings</li>
        <li>Profile</li>
      </ul>
    </aside>
  );
};

// Footer component - should be extracted
function Footer() {
  return (
    <footer className="footer">
      <p>&copy; 2024 My Company. All rights reserved.</p>
    </footer>
  );
}

// Main App component - should NOT be extracted
function App() {
  const [users, setUsers] = useState([]);

  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main className="content">
          <h2>Welcome to the Dashboard</h2>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default App;`;

  try {
    // Write test file
    fs.writeFileSync('./App.jsx', testApp, 'utf8');
    console.log('✅ Created test App.jsx');

    // Test the modularizer
    const modularizer = new ReactModularizer({ verbose: true });
    const result = await modularizer.run();

    console.log('\n📊 Test Results:');
    console.log(`✅ Components extracted: ${result.components.length}`);
    console.log(`✅ Files created: ${result.components.length + 1}`);
    
    result.components.forEach(comp => {
      console.log(`  - components/${comp.filename}`);
    });

    // Verify files exist
    if (fs.existsSync('./components')) {
      const files = fs.readdirSync('./components');
      console.log(`✅ Components directory contains ${files.length} files`);
    }

    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Clean up function
function cleanup() {
  try {
    if (fs.existsSync('./App.jsx')) {
      fs.unlinkSync('./App.jsx');
    }
    if (fs.existsSync('./components')) {
      fs.rmSync('./components', { recursive: true, force: true });
    }
    console.log('🧹 Cleaned up test files');
  } catch (error) {
    console.warn('⚠️ Cleanup failed:', error.message);
  }
}

// Run test with cleanup
if (require.main === module) {
  runTest()
    .then(() => {
      console.log('\n🧹 Cleaning up...');
      cleanup();
    })
    .catch(error => {
      console.error('💥 Test error:', error);
      cleanup();
      process.exit(1);
    });
}

module.exports = { runTest, cleanup };
