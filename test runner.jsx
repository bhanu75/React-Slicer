const fs = require('fs');
const path = require('path');
const ReactModularizer = require('./modularize');

class ModularizerTester {
  constructor() {
    this.testDir = './test-output';
    this.originalDir = process.cwd();
  }

  async runTests() {
    console.log('🧪 React Modularizer Test Suite\n');

    try {
      // Setup test environment
      this.setupTestEnvironment();
      
      // Run the modularizer
      const modularizer = new ReactModularizer();
      await modularizer.run();
      
      // Validate results
      this.validateResults();
      
      console.log('🎉 All tests passed! The modularizer works correctly.\n');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    } finally {
      // Cleanup
      this.cleanup();
    }
  }

  setupTestEnvironment() {
    console.log('🏗️  Setting up test environment...');
    
    // Create test directory
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testDir, { recursive: true });
    
    // Copy sample App.jsx to test directory
    const sampleApp = `import React, { useState } from 'react';

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

function App() {
  return (
    <div className="app">
      <Header />
      <div className="main-layout">
        <Sidebar />
        <main className="content">
          <h2>Welcome to the Dashboard</h2>
        </main>
      </div>
    </div>
  );
}

export default App;`;

    fs.writeFileSync(path.join(this.testDir, 'App.jsx'), sampleApp, 'utf8');
    
    // Change to test directory
    process.chdir(this.testDir);
    
    console.log('✓ Test environment ready');
  }

  validateResults() {
    console.log('🔍 Validating results...');
    
    // Check if components directory was created
    const componentsDir = './components';
    if (!fs.existsSync(componentsDir)) {
      throw new Error('Components directory was not created');
    }
    console.log('✓ Components directory created');
    
    // Check if component files exist
    const expectedFiles = ['Header.jsx', 'Sidebar.jsx'];
    expectedFiles.forEach(fileName => {
      const filePath = path.join(componentsDir, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Expected component file ${fileName} not found`);
      }
      console.log(`✓ ${fileName} created`);
    });
    
    // Check if App.jsx was updated with imports
    const updatedApp = fs.readFileSync('./App.jsx', 'utf8');
    if (!updatedApp.includes("import Header from './components/Header';")) {
      throw new Error('Header import not found in updated App.jsx');
    }
    if (!updatedApp.includes("import Sidebar from './components/Sidebar';")) {
      throw new Error('Sidebar import not found in updated App.jsx');
    }
    console.log('✓ App.jsx updated with imports');
    
    // Check if components were removed from App.jsx
    if (updatedApp.includes('function Header()') || updatedApp.includes('const Sidebar =')) {
      throw new Error('Components were not properly removed from App.jsx');
    }
    console.log('✓ Components properly extracted from App.jsx');
    
    // Validate component file contents
    const headerContent = fs.readFileSync('./components/Header.jsx', 'utf8');
    if (!headerContent.includes('export default function Header')) {
      throw new Error('Header component not properly formatted');
    }
    console.log('✓ Header.jsx properly formatted');
    
    const sidebarContent = fs.readFileSync('./components/Sidebar.jsx', 'utf8');
    if (!sidebarContent.includes('export default Sidebar')) {
      throw new Error('Sidebar component not properly formatted');
    }
    console.log('✓ Sidebar.jsx properly formatted');
  }

  cleanup() {
    // Return to original directory
    process.chdir(this.originalDir);
    
    // Remove test directory
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    
    console.log('🧹 Test cleanup completed');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ModularizerTester();
  tester.runTests().catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = ModularizerTester;
