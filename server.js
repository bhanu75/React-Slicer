const express = require('express');
const fs = require('fs');
const path = require('path');
const serverless = require('serverless-http');
const ReactModularizer = require('./modularize');

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

// API endpoint for modularization
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

    console.log('🚀 Processing modularization request...');
    
    // Create custom modularizer instance for API
    const modularizer = new APIModularizer();
    const results = await modularizer.processCode(code);
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ Modularization completed in ${processingTime}ms`);
    console.log(`📊 Extracted ${results.components.length} components`);
    
    res.json({
      ...results,
      processingTime,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    
    res.status(500).json({
      error: 'Modularization failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
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
    timestamp: new Date().toISOString()
  });
});

// Utility functions for component processing
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

// Custom modularizer class for API responses
class APIModularizer extends ReactModularizer {
  constructor() {
    super();
    this.appFilePath = '/tmp/App.jsx';
    this.componentsDir = '/tmp/components';
    this.results = {
      updatedApp: '',
      components: [],
      fileStructure: '',
      summary: {}
    };
  }

  async processCode(code) {
    // Write temporary App.jsx to /tmp directory
    fs.writeFileSync('/tmp/App.jsx', code, 'utf8');
    
    try {
      // Parse and extract components
      const ast = this.parseToAST(code);
      this.extractComponents(ast);
      
      if (this.extractedComponents.length === 0) {
        return {
          updatedApp: code,
          components: [],
          fileStructure: generateFileStructure([]),
          summary: {
            extractedCount: 0,
            message: 'No extractable components found'
          }
        };
      }
      
      // Generate component files content using the utility function
      const componentFiles = await generateComponentFiles(this.extractedComponents, this.formatCode.bind(this));
      
      // Generate updated App.jsx
      const updatedApp = await this.updateAppFile(ast);
      
      // Clean up temporary files
      this.cleanupTempFiles();
      
      return {
        updatedApp,
        components: componentFiles,
        fileStructure: generateFileStructure(componentFiles),
        summary: {
          extractedCount: componentFiles.length,
          message: `Successfully extracted ${componentFiles.length} components`
        }
      };
      
    } catch (error) {
      this.cleanupTempFiles();
      throw error;
    }
  }

  cleanupTempFiles() {
    const filesToClean = ['/tmp/App.jsx', '/tmp/components'];
    
    filesToClean.forEach(file => {
      if (fs.existsSync(file)) {
        if (fs.statSync(file).isDirectory()) {
          fs.rmSync(file, { recursive: true, force: true });
        } else {
          fs.unlinkSync(file);
        }
      }
    });
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred',
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

// For local development only
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('🚀 React Component Modularizer Server');
    console.log('=' .repeat(50));
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`📋 Status: http://localhost:${PORT}/api/status`);
    console.log('=' .repeat(50));
    console.log('✅ Server ready for professional use!');
  });
}

// Export for Vercel
module.exports = app;
module.exports.handler = serverless(app);
