#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const prettier = require('prettier');

class NextJSModularizer {
  constructor() {
    this.extractedComponents = [];
    this.imports = [];
    this.inputFile = this.findInputFile();
    this.componentsDir = './components';
  }

  // Find the input file - check multiple locations
  findInputFile() {
    const possibleFiles = [
      './App.jsx',
      './pages/index.js',
      './pages/_app.js',
      './src/App.jsx',
      './app/page.js' // App Router
    ];

    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        console.log(`✅ Found input file: ${file}`);
        return file;
      }
    }

    // If no file found, create a sample App.jsx
    console.log('❌ No suitable file found. Creating sample App.jsx...');
    this.createSampleApp();
    return './App.jsx';
  }

  createSampleApp() {
    const sampleApp = `import React, { useState } from 'react';

// Header component
function Header() {
  return (
    <header className="bg-blue-600 text-white p-4">
      <h1 className="text-2xl font-bold">My App</h1>
    </header>
  );
}

// Sidebar component  
const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <aside className="bg-gray-800 text-white w-64 p-4">
      <button onClick={() => setIsOpen(!isOpen)}>
        Toggle
      </button>
    </aside>
  );
};

// Main App
function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2>Welcome to the app!</h2>
        </main>
      </div>
    </div>
  );
}

export default App;`;

    fs.writeFileSync('./App.jsx', sampleApp, 'utf8');
    console.log('✅ Created sample App.jsx');
  }

  async run() {
    console.log('🚀 Next.js Component Modularizer\n');
    
    try {
      console.log(`📖 Reading ${this.inputFile}...`);
      const content = fs.readFileSync(this.inputFile, 'utf8');
      
      console.log('🔍 Parsing code...');
      const ast = this.parseToAST(content);
      
      console.log('🔍 Finding components...');
      this.extractComponents(ast);
      
      if (this.extractedComponents.length === 0) {
        console.log('ℹ️  No extractable components found.');
        return;
      }
      
      this.ensureComponentsDirectory();
      await this.writeComponentFiles();
      
      const updatedContent = await this.updateInputFile(ast);
      fs.writeFileSync(this.inputFile, updatedContent, 'utf8');
      
      this.showResults();
      console.log('✅ Modularization complete!');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      
      // Show helpful error message
      if (error.message.includes('Missing dependencies')) {
        console.log('\n💡 Solution: Install dependencies:');
        console.log('npm install @babel/parser @babel/traverse @babel/generator prettier');
      }
    }
  }

  parseToAST(content) {
    try {
      return parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
    } catch (error) {
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  }

  extractComponents(ast) {
    const componentsToRemove = [];
    
    traverse(ast, {
      FunctionDeclaration: (path) => {
        const name = path.node.id?.name;
        
        if (this.isExtractableComponent(name)) {
          const code = generate(path.node, {}, '').code;
          
          this.extractedComponents.push({
            name,
            code,
            type: 'function'
          });
          
          this.imports.push(`import ${name} from './components/${name}';`);
          componentsToRemove.push(path);
          
          console.log(`  ✓ Found: ${name}`);
        }
      },
      
      VariableDeclaration: (path) => {
        path.node.declarations.forEach(declarator => {
          const name = declarator.id?.name;
          
          if (name && 
              (declarator.init?.type === 'ArrowFunctionExpression' || 
               declarator.init?.type === 'FunctionExpression') &&
              this.isExtractableComponent(name)) {
            
            const code = generate(path.node, {}, '').code;
            
            this.extractedComponents.push({
              name,
              code,
              type: 'arrow'
            });
            
            this.imports.push(`import ${name} from './components/${name}';`);
            componentsToRemove.push(path);
            
            console.log(`  ✓ Found: ${name}`);
          }
        });
      }
    });
    
    componentsToRemove.forEach(path => path.remove());
  }

  isExtractableComponent(name) {
    const excludedNames = ['App', 'MyApp', 'Home', 'Index'];
    return name && 
           name[0] === name[0].toUpperCase() && 
           !excludedNames.includes(name) &&
           name.length > 1;
  }

  ensureComponentsDirectory() {
    if (!fs.existsSync(this.componentsDir)) {
      fs.mkdirSync(this.componentsDir, { recursive: true });
      console.log('📁 Created components directory');
    }
  }

  async writeComponentFiles() {
    console.log('📝 Writing component files...');
    
    for (const component of this.extractedComponents) {
      const fileName = `${component.name}.jsx`;
      const filePath = path.join(this.componentsDir, fileName);
      
      let exportCode = "import React from 'react';\n\n";
      
      if (component.type === 'function') {
        exportCode += component.code.replace(/^function\s+\w+/, `export default function ${component.name}`);
      } else {
        exportCode += `${component.code};\n\nexport default ${component.name};`;
      }
      
      try {
        const formattedCode = await prettier.format(exportCode, {
          parser: 'babel',
          semi: true,
          singleQuote: true,
          tabWidth: 2
        });
        exportCode = formattedCode;
      } catch (prettierError) {
        console.warn(`⚠️  Prettier failed for ${fileName}`);
      }
      
      fs.writeFileSync(filePath, exportCode, 'utf8');
      console.log(`  ✅ Created: ${fileName}`);
    }
  }

  async updateInputFile(ast) {
    let updatedContent = generate(ast, {}, '').code;
    
    if (this.imports.length > 0) {
      const lines = updatedContent.split('\n');
      let insertIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('import ')) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, '', ...this.imports);
      updatedContent = lines.join('\n');
    }
    
    try {
      return await prettier.format(updatedContent, {
        parser: 'babel',
        semi: true,
        singleQuote: true,
        tabWidth: 2
      });
    } catch (error) {
      return updatedContent;
    }
  }

  showResults() {
    console.log('\n🎯 RESULTS:');
    console.log(`✅ Extracted ${this.extractedComponents.length} components:`);
    this.extractedComponents.forEach(comp => {
      console.log(`  - components/${comp.name}.jsx`);
    });
    console.log(`✅ Updated ${this.inputFile}`);
    
    if (this.inputFile === './App.jsx') {
      console.log('\n💡 To use in Next.js:');
      console.log('1. Copy components to your Next.js project');
      console.log('2. Import them in your pages');
    }
  }
}

// Run
if (require.main === module) {
  const modularizer = new NextJSModularizer();
  modularizer.run();
}

module.exports = NextJSModularizer;