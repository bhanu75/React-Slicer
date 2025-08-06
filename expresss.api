const express = require('express');
const fs = require('fs');
const path = require('path');
const ReactModularizer = require('./modularize');

const app = express();
const PORT = process.env.PORT || 3000;

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
    
    // Create temporary App.jsx file
    const tempAppPath = './temp-App.jsx';
    fs.writeFileSync(tempAppPath, code, 'utf8');
    
    // Create custom modularizer instance for API
    const modularizer = new APIModularizer();
    const results = await modularizer.processCode(code);
    
    // Cleanup
    if (fs.existsSync(tempAppPath)) {
      fs.unlinkSync(tempAppPath);
    }
    
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

// Custom modularizer class for API responses
class APIModularizer extends ReactModularizer {
  constructor() {
    super();
    this.results = {
      updatedApp: '',
      components: [],
      fileStructure: '',
      summary: {}
    };
  }

  async processCode(code) {
    // Write temporary App.jsx
    fs.writeFileSync('./App.jsx', code, 'utf8');
    
    try {
      // Parse and extract components
      const ast = this.parseToAST(code);
      this.extractComponents(ast);
      
      if (this.extractedComponents.length === 0) {
        return {
          updatedApp: code,
          components: [],
          fileStructure: this.generateFileStructure([]),
          summary: {
            extractedCount: 0,
            message: 'No extractable components found'
          }
        };
      }
      
      // Generate component files content
      const componentFiles = await this.generateComponentFiles();
      
      // Generate updated App.jsx
      const updatedApp = await this.updateAppFile(ast);
      
      // Clean up temporary files
      this.cleanupTempFiles();
      
      return {
        updatedApp,
        components: componentFiles,
        fileStructure: this.generateFileStructure(componentFiles),
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

  async generateComponentFiles() {
    const componentFiles = [];
    
    for (const component of this.extractedComponents) {
      let exportCode;
      
      if (component.type === 'function') {
        exportCode = component.code.replace(
          /^function\s+\w+/, 
          'export default function ' + component.name
        );
      } else {
        exportCode = `${component.code};\n\nexport default ${component.name};`;
      }
      
      // Format with prettier
      const formattedCode = await this.formatCode(exportCode);
      
      componentFiles.push({
        name: component.name,
        filename: `${component.name}.jsx`,
        code: formattedCode,
        type: component.type
      });
    }
    
    return componentFiles;
  }

  generateFileStructure(components) {
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

  cleanupTempFiles() {
    const filesToClean = ['./App.jsx', './components'];
    
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

// Start server
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

module.exports = app;
