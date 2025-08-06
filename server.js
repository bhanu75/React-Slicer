const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Simple test endpoint first
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'vercel'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'React Component Modularizer API',
    version: '1.0.0',
    status: 'active',
    endpoints: [
      'POST /api/modularize - Process React code',
      'GET /api/health - Health check',
      'GET /api/status - API information'
    ],
    timestamp: new Date().toISOString(),
    platform: 'vercel-serverless'
  });
});

// Simplified modularizer without file dependencies
app.post('/api/modularize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { code } = req.body;
    
    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        error: 'No code provided',
        message: 'Please provide App.jsx content to modularize'
      });
    }

    // Simple component extraction logic without file system
    const result = await processCodeInMemory(code);
    const processingTime = Date.now() - startTime;
    
    res.json({
      ...result,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Error:', error.message);
    
    res.status(500).json({
      error: 'Modularization failed',
      message: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// In-memory processing function (no file system)
async function processCodeInMemory(code) {
  try {
    // Simple regex-based component extraction for now
    const components = [];
    const lines = code.split('\n');
    let updatedCode = code;
    
    // Find function components
    const functionComponentRegex = /^function\s+([A-Z][a-zA-Z]*)\s*\(/gm;
    let match;
    
    while ((match = functionComponentRegex.exec(code)) !== null) {
      const componentName = match[1];
      if (componentName !== 'App') {
        components.push({
          name: componentName,
          filename: `${componentName}.jsx`,
          code: extractComponentCode(code, componentName, 'function'),
          type: 'function'
        });
      }
    }
    
    // Find arrow components
    const arrowComponentRegex = /^const\s+([A-Z][a-zA-Z]*)\s*=\s*\(/gm;
    while ((match = arrowComponentRegex.exec(code)) !== null) {
      const componentName = match[1];
      if (componentName !== 'App') {
        components.push({
          name: componentName,
          filename: `${componentName}.jsx`,
          code: extractComponentCode(code, componentName, 'arrow'),
          type: 'arrow'
        });
      }
    }
    
    // Generate imports
    const imports = components.map(c => `import ${c.name} from './components/${c.name}';`);
    
    // Update main code
    if (imports.length > 0) {
      const importSection = imports.join('\n') + '\n\n';
      updatedCode = code.replace(
        /(import.*from.*['"];?\s*\n)+/,
        `$&${importSection}`
      );
      
      // Remove component definitions
      components.forEach(component => {
        const regex = new RegExp(`^(function\\s+${component.name}|const\\s+${component.name}\\s*=)[\\s\\S]*?^}[;]?`, 'gm');
        updatedCode = updatedCode.replace(regex, '').replace(/\n\n\n+/g, '\n\n');
      });
    }
    
    return {
      updatedApp: updatedCode.trim(),
      components,
      fileStructure: generateFileStructure(components),
      summary: {
        extractedCount: components.length,
        message: `Successfully extracted ${components.length} components`
      }
    };
    
  } catch (error) {
    throw new Error(`Processing failed: ${error.message}`);
  }
}

function extractComponentCode(fullCode, componentName, type) {
  const lines = fullCode.split('\n');
  let componentCode = '';
  let inComponent = false;
  let braceCount = 0;
  let startPattern;
  
  if (type === 'function') {
    startPattern = new RegExp(`^function\\s+${componentName}\\s*\\(`);
  } else {
    startPattern = new RegExp(`^const\\s+${componentName}\\s*=`);
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!inComponent && startPattern.test(line.trim())) {
      inComponent = true;
      componentCode += line + '\n';
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      continue;
    }
    
    if (inComponent) {
      componentCode += line + '\n';
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      
      if (braceCount === 0) {
        break;
      }
    }
  }
  
  const fs = require('fs');
const path = require('path');

// Convert to export format
function convertToExport(componentCode, componentName, type) {
  if (type === 'function') {
    return componentCode.replace(
      new RegExp(`^\\s*function\\s+${componentName}`),
      `export default function ${componentName}`
    );
  } else {
    return componentCode.trim() + `\n\nexport default ${componentName};`;
  }
}

async function generateComponentFiles(extractedComponents, formatCodeFn) {
  const componentFiles = [];

  const componentsDir = '/tmp/components';
  if (!fs.existsSync(componentsDir)) {
    fs.mkdirSync(componentsDir, { recursive: true });
  }

  for (const component of extractedComponents) {
    const exportCode = convertToExport(component.code, component.name, component.type);
    const formattedCode = await formatCodeFn(exportCode);

    const filePath = path.join(componentsDir, `${component.name}.jsx`);
    fs.writeFileSync(filePath, formattedCode, 'utf8');

    componentFiles.push({
      name: component.name,
      filename: `${component.name}.jsx`,
      code: formattedCode,
      type: component.type
    });
  }

  return componentFiles;
}

function generateFileStructure(components) {
  let structure = `your-project/\n├── App.jsx                 // Updated with imports\n├── components/             // Generated components\n`;

  components.forEach((component, index) => {
    const isLast = index === components.length - 1;
    const prefix = isLast ? '└──' : '├──';
    structure += `│   ${prefix} ${component.filename}\n`;
  });

  structure += `└── package.json           // Your project config\n\n`;
  structure += `📊 Summary:\n`;
  structure += `• ${components.length} components extracted\n`;
  structure += `• ${components.length + 1} files created\n`;
  structure += `• Clean, modular architecture\n`;
  structure += `• Ready for production use`;

  return structure;
}


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not a valid endpoint`,
    availableEndpoints: [
      'GET / - Frontend interface',
      'POST /api/modularize - Process React code',
      'GET /api/health - Health check',
      'GET /api/status - API information'
    ]
  });
});

// Export for Vercel (no app.listen for serverless)
module.exports = app;
module.exports.handler = serverless(app);
