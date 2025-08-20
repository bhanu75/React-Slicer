// pages/api/modularize.js

import parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import prettier from 'prettier';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

class ReactModularizer {
  constructor() {
    this.extractedComponents = [];
    this.imports = [];
    this.requiredImports = new Set();
  }

  async processCode(code) {
    try {
      // Step 1: Parse into AST
      const ast = this.parseToAST(code);
      
      // Step 2: Extract existing imports
      this.extractImports(ast);
      
      // Step 3: Extract components
      this.extractComponents(ast);
      
      if (this.extractedComponents.length === 0) {
        return {
          updatedApp: code,
          components: [],
          message: 'No extractable components found'
        };
      }
      
      // Step 4: Generate component files
      const components = await this.generateComponentFiles();
      
      // Step 5: Update App.jsx with imports
      const updatedAppContent = await this.updateAppFile(ast);
      
      return {
        updatedApp: updatedAppContent,
        components
      };
      
    } catch (error) {
      throw new Error(`Modularization failed: ${error.message}`);
    }
  }

  parseToAST(content) {
    try {
      return parser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });
    } catch (error) {
      throw new Error(`Failed to parse code: ${error.message}`);
    }
  }

  extractImports(ast) {
    const existingImports = [];
    
    traverse.default(ast, {
      ImportDeclaration(path) {
        const importCode = generate.default(path.node, {}, '').code;
        existingImports.push(importCode);
        
        if (path.node.source.value === 'react') {
          this.requiredImports.add(importCode);
        }
      }
    });
    
    this.existingImports = existingImports;
  }

  extractComponents(ast) {
    const componentsToRemove = [];
    const self = this;
    
    traverse.default(ast, {
      FunctionDeclaration(path) {
        const name = path.node.id?.name;
        
        if (name && self.isExtractableComponent(name)) {
          const componentCode = generate.default(path.node, {}, '').code;
          
          self.extractedComponents.push({
            name,
            code: componentCode,
            type: 'function',
            needsReact: self.componentNeedsReact(componentCode)
          });
          
          self.imports.push(`import ${name} from './components/${name}';`);
          componentsToRemove.push(path);
        }
      },
      
      VariableDeclaration(path) {
        path.node.declarations.forEach(declarator => {
          if (declarator.id?.name && 
              (declarator.init?.type === 'ArrowFunctionExpression' || 
               declarator.init?.type === 'FunctionExpression')) {
            
            const name = declarator.id.name;
            
            if (name && self.isExtractableComponent(name)) {
              const componentCode = generate.default(path.node, {}, '').code;
              
              self.extractedComponents.push({
                name,
                code: componentCode,
                type: 'arrow',
                needsReact: self.componentNeedsReact(componentCode)
              });
              
              self.imports.push(`import ${name} from './components/${name}';`);
              componentsToRemove.push(path);
            }
          }
        });
      }
    });
    
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
    return name && 
           name[0] === name[0].toUpperCase() && 
           name !== 'App' &&
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

  async updateAppFile(ast) {
    let updatedContent = generate.default(ast, {}, '').code;
    
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
      console.warn('Prettier formatting failed, using unformatted code');
      return code;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { code } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid code' });
  }

  const startTime = Date.now();

  try {
    const modularizer = new ReactModularizer();
    const result = await modularizer.processCode(code);
    
    const endTime = Date.now();

    return res.status(200).json({
      ...result,
      processingTime: endTime - startTime
    });
    
  } catch (error) {
    console.error('❌ Modularization failed:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal error during modularization' 
    });
  }
}
