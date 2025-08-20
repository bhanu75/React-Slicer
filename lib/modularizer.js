#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Dynamic imports for better error handling
let parser, traverse, generate, prettier;

async function loadDependencies() {
  try {
    parser = require('@babel/parser');
    traverse = require('@babel/traverse').default;
    generate = require('@babel/generator').default;
    prettier = require('prettier');
    return true;
  } catch (error) {
    console.error('❌ Missing dependencies. Please install:');
    console.log('npm install @babel/parser @babel/traverse @babel/generator prettier');
    return false;
  }
}

class ReactModularizer {
  constructor(options = {}) {
    this.extractedComponents = [];
    this.imports = [];
    this.appFilePath = options.appFilePath || './App.jsx';
    this.componentsDir = options.componentsDir || './components';
    this.requiredImports = new Set();
    this.verbose = options.verbose !== false; // Default to verbose
  }

  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }

  async run() {
    this.log('🚀 React Component Modularizer CLI\n');
    
    // Load dependencies first
    if (!(await loadDependencies())) {
      process.exit(1);
    }
    
    try {
      // Step 1: Read and validate App.jsx
      const appContent = this.readAppFile();
      
      // Step 2: Process the code
      const result = await this.processCode(appContent);
      
      if (result.components.length === 0) {
        this.log('ℹ️  No extractable components found. App.jsx is already modular.\n');
        return result;
      }
      
      // Step 3: Create components directory
      this.ensureComponentsDirectory();
      
      // Step 4: Write component files
      await this.writeComponentFiles(result.components);
      
      // Step 5: Save updated App.jsx
      fs.writeFileSync(this.appFilePath, result.updatedApp, 'utf8');
      
      // Step 6: Display results
      this.displayResults(result);
      
      this.log('✅ Modularization complete!\n');
      return result;
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (this.verbose) {
        console.error('Stack trace:', error.stack);
      }
      throw error; // Re-throw for API usage
    }
  }

  async processCode(code) {
    // Load dependencies if not already loaded
    if (!parser) {
      if (!(await loadDependencies())) {
        throw new Error('Failed to load required dependencies');
      }
    }
    
    try {
      // Reset state
      this.extractedComponents = [];
      this.imports = [];
      this.requiredImports = new Set();
      
      // Step 1: Parse into AST
      const ast = this.parseToAST(code);
      
      // Step 2: Extract existing imports
      this.extractImports(ast);
      
      // Step 3: Extract components
      this.extractComponents(ast);
      
      // Step 4: Generate component files data
      const components = await this.generateComponentFiles();
      
      // Step 5: Update App.jsx with imports
      const updatedAppContent = await this.updateAppFile(ast);
      
      return {
        updatedApp: updatedAppContent,
        components,
        extractedCount: this.extractedComponents.length
      };
      
    } catch (error) {
      throw new Error(`Code processing failed: ${error.message}`);
    }
  }

  readAppFile() {
    if (!fs.existsSync(this.appFilePath)) {
      throw new Error(`${this.appFilePath} not found in current directory`);
    }
    
    const content = fs.readFileSync(this.appFilePath, 'utf8');
    this.log(`📖 Reading ${this.appFilePath}...`);
    return content;
  }

  parseToAST(content) {
    try {
      return parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });
    } catch (error) {
      throw new Error(`Failed to parse code: ${error.message}`);
    }
  }

  extractImports(ast) {
    const existingImports = [];
    
    traverse(ast, {
      ImportDeclaration(path) {
        const importCode = generate(path.node, {}, '').code;
        existingImports.push(importCode);
        
        if (path.node.source.value === 'react') {
          this.requiredImports.add(importCode);
        }
      }
    });
    
    this.existingImports = existingImports;
  }

  extractComponents(ast) {
    this.log('🔍 Scanning for extractable components...');
    
    const componentsToRemove = [];
    const self = this;
    
    traverse(ast, {
      FunctionDeclaration(path) {
        const name = path.node.id?.name;
        
        if (name && self.isExtractableComponent(name)) {
          const componentCode = generate(path.node, {}, '').code;
          
          self.extractedComponents.push({
            name,
            code: componentCode,
            type: 'function',
            needsReact: self.componentNeedsReact(componentCode)
          });
          
          self.imports.push(`import ${name} from './components/${name}';`);
          componentsToRemove.push(path);
          
          self.log(`  ✓ Found function component: ${name}`);
        }
      },
      
      VariableDeclaration(path) {
        path.node.declarations.forEach(declarator => {
          if (declarator.id?.name && 
              (declarator.init?.type === 'ArrowFunctionExpression' || 
               declarator.init?.type === 'FunctionExpression')) {
            
            const name = declarator.id.name;
            
            if (name && self.isExtractableComponent(name)) {
              const componentCode = generate(path.node, {}, '').code;
              
              self.extractedComponents.push({
                name,
                code: componentCode,
                type: 'arrow',
                needsReact: self.componentNeedsReact(componentCode)
              });
              
              self.imports.push(`import ${name} from './components/${name}';`);
              componentsToRemove.push(path);
              
              self.log(`  ✓ Found arrow function component: ${name}`);
            }
          }
        });
      }
    });
    
    // Remove extracted components from AST
    componentsToRemove.forEach(path => path.remove());
  }

  componentNeedsReact(code) {
    return code.includes('useState') || 
           code.includes('useEffect') || 
           code.includes('React.') || 
           code.includes('<') ||
           code.includes('/>');
  }

  isExtractableComponent(name) {
    const excludedNames = ['App', 'MyApp', 'Home', 'Index', 'Page', 'Layout'];
    return name && 
           name[0] === name[0].toUpperCase() && 
           !excludedNames.includes(name) &&
           name.length > 1;
  }

  async generateComponentFiles() {
    const components = [];
    
    for (const component of this.extractedComponents) {
      const fileName = `${component.name}.jsx`;
      
      let exportCode = '';
      
      // Add React import if needed
      if (component.needsReact) {
        exportCode += "import React from 'react';\n\n";
      }
      
      // Convert to export default format
      if (component.type === 'function') {
        exportCode += component.code.replace(/^function\s+\w+/, 'export default function ' + component.name);
      } else {
        exportCode += `${component.code};\n\nexport default ${component.name};`;
      }
      
      // Format with prettier
      const formattedCode = await this.formatCode(exportCode);
      
      components.push({
        name: component.name,
        filename: fileName,
        code: formattedCode
      });
    }
    
    return components;
  }

  ensureComponentsDirectory() {
    if (!fs.existsSync(this.componentsDir)) {
      fs.mkdirSync(this.componentsDir, { recursive: true });
      this.log('📁 Created components directory');
    }
  }

  async writeComponentFiles(components) {
    this.log('📝 Writing component files...');
    
    for (const component of components) {
      const filePath = path.join(this.componentsDir, component.filename);
      fs.writeFileSync(filePath, component.code, 'utf8');
      this.log(`  ✓ Created: components/${component.filename}`);
    }
  }

  async updateAppFile(ast) {
    this.log('🔄 Updating App.jsx with imports...');
    
    let updatedContent = generate(ast, {}, '').code;
    
    if (this.imports.length > 0) {
      const lines = updatedContent.split('\n');
      let insertIndex = 0;
      
      // Find where to insert imports
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
    
    return await this.formatCode(updatedContent);
  }

  async formatCode(code) {
    try {
      return await prettier.format(code, {
        parser: 'babel',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5'
      });
    } catch (error) {
      this.log('⚠️  Prettier formatting failed, using unformatted code');
      return code;
    }
  }

  displayResults(result) {
    if (!this.verbose) return;
    
    this.log('\n🎯 MODULARIZATION RESULTS\n');
    this.log('='.repeat(60));
    
    // Display updated App.jsx
    this.log('\n📄 Updated App.jsx:');
    this.log('```jsx');
    this.log(result.updatedApp);
    this.log('```\n');
    
    // Display each component file
    result.components.forEach(component => {
      this.log(`📄 components/${component.filename}:`);
      this.log('```jsx');
      this.log(component.code);
      this.log('```\n');
    });
    
    this.log('='.repeat(60));
    this.log(`✅ Extracted ${result.components.length} component(s)`);
    this.log(`✅ Created ${result.components.length} file(s) in /components`);
    this.log('✅ Updated App.jsx with import statements\n');
  }
}

// CLI Entry Point
if (require.main === module) {
  const modularizer = new ReactModularizer();
  modularizer.run().catch(error => {
    console.error('💥 Fatal Error:', error.message);
    process.exit(1);
  });
}

module.exports = ReactModularizer;
