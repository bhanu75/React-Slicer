
const ReactModularizer = require('../../lib/modularizer.js');


export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

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
    // Use the modularizer directly instead of spawning a process
    const modularizer = new ReactModularizer({ 
      verbose: false  // Don't log to console in API
    });
    
    const result = await modularizer.processCode(code);
    
    const endTime = Date.now();

    return res.status(200).json({
      updatedApp: result.updatedApp,
      components: result.components,
      processingTime: endTime - startTime
    });
    
  } catch (err) {
    console.error('❌ Modularization failed:', err);
    return res.status(500).json({ 
      error: err.message || 'Internal error during modularization',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
