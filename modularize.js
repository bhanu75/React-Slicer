#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const prettier = require('prettier');

class ReactModularizer {
  constructor() {
    this.extractedComponents = [];
    this.imports = [];
    this.appFilePath = './App.jsx';
    this.componentsDir = './components';
  }

  // Main execution flow
  async run() {
    console.log('🚀 React Component Modularizer CLI\n');
    
    try {
      // Step 1: Read and validate App.jsx
      const appContent = this.readAppFile();
      
      // Step 2: Parse into AST
      const ast = this.parseToAST(appContent);
      
      // Step 3: Extract components
      this.extractComponents(ast);
      
      if (this.extractedComponents.length === 0) {
        console.log('ℹ️  No extractable components found. App.jsx is already modular.\n');
        return;
      }
      
      // Step 4: Create components directory
      this.ensureComponentsDirectory();
      
      // Step 5: Write component files
      await this.writeComponentFiles();
      
      // Step 6: Update App.jsx with imports
      const updatedAppContent = await this.updateAppFile(ast);
      
      // Step 7: Save updated App.jsx
      fs.writeFileSync(this.appFilePath, updatedAppContent, 'utf8');
      
      // Step 8: Display results
      this.displayResults(updatedAppContent);
      
      console.log('✅ Modularization complete!\n');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  readAppFile() {
    if (!fs.existsSync(this.appFilePath)) {
      throw new Error('App.jsx not found in current directory');
    }
    
    const content = fs.readFileSync(this.appFilePath, 'utf8');
    console.log('📖 Reading App.jsx...');
    return content;
  }

  parseToAST(content) {
    try {
      return parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
    } catch (error) {
      throw new Error(`Failed to parse App.jsx: ${error.message}`);
    }
  }

  extractComponents(ast) {
    console.log('🔍 Scanning for extractable components...');
    
    const componentsToRemove = [];
    const self = this; // Fix for 'this' context issue
    
    traverse(ast, {
      // Handle function Component() declarations
      FunctionDeclaration(path) {
        const name = path.node.id?.name;
        
        if (name && self.isExtractableComponent(name)) {
          const componentCode = generate(path.node, {}, '').code;
          
          self.extractedComponents.push({
            name,
            code: componentCode,
            type: 'function'
          });
          
          self.imports.push(`import ${name} from './components/${name}';`);
          componentsToRemove.push(path);
          
          console.log(`  ✓ Found function component: ${name}`);
        }
      },
      
      // Handle const Component = () => {} declarations
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
                type: 'arrow'
              });
              
              self.imports.push(`import ${name} from './components/${name}';`);
              componentsToRemove.push(path);
              
              console.log(`  ✓ Found arrow function component: ${name}`);
            }
          }
        });
      }
    });
    
    // Remove extracted components from AST
    componentsToRemove.forEach(path => path.remove());
  }

  isExtractableComponent(name) {
    // Component must start with uppercase and not be "App"
    return name && 
           name[0] === name[0].toUpperCase() && 
           name !== 'App' &&
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
      
      // Convert to export default format
      let exportCode;
      if (component.type === 'function') {
        exportCode = `${component.code.replace(/^function\s+\w+/, 'export default function ' + component.name)}`;
      } else {
        exportCode = `${component.code};\n\nexport default ${component.name};`;
      }
      
      // Format with prettier
      const formattedCode = await this.formatCode(exportCode);
      
      fs.writeFileSync(filePath, formattedCode, 'utf8');
      console.log(`  ✓ Created: components/${fileName}`);
    }
  }

  async updateAppFile(ast) {
    console.log('🔄 Updating App.jsx with imports...');
    
    // Generate updated App.jsx code
    let updatedContent = generate(ast, {}, '').code;
    
    // Add imports at the top (after existing imports if any)
    if (this.imports.length > 0) {
      const importStatements = this.imports.join('\n') + '\n\n';
      
      // Find where to insert imports (after existing imports or at the top)
      const lines = updatedContent.split('\n');
      let insertIndex = 0;
      
      // Find the last import line
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          insertIndex = i + 1;
        } else if (lines[i].trim() && !lines[i].trim().startsWith('import ')) {
          break;
        }
      }
      
      lines.splice(insertIndex, 0, ...this.imports, '');
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
      console.warn('⚠️  Prettier formatting failed, using unformatted code');
      return code;
    }
  }

  displayResults(updatedAppContent) {
    console.log('\n🎯 MODULARIZATION RESULTS\n');
    console.log('=' .repeat(60));
    
    // Display updated App.jsx
    console.log('\n📄 Updated App.jsx:');
    console.log('```jsx');
    console.log(updatedAppContent);
    console.log('```\n');
    
    // Display each component file
    this.extractedComponents.forEach(component => {
      const filePath = path.join(this.componentsDir, `${component.name}.jsx`);
      const content = fs.readFileSync(filePath, 'utf8');
      
      console.log(`📄 components/${component.name}.jsx:`);
      console.log('```jsx');
      console.log(content);
      console.log('```\n');
    });
    
    console.log('=' .repeat(60));
    console.log(`✅ Extracted ${this.extractedComponents.length} component(s)`);
    console.log(`✅ Created ${this.extractedComponents.length} file(s) in /components`);
    console.log('✅ Updated App.jsx with import statements\n');
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
