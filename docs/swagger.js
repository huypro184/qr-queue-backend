const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const YAML = require('yamljs');

function mergeObject(target, src) {
  if (!src) return;
  Object.keys(src).forEach((k) => {
    if (
      src[k] &&
      typeof src[k] === 'object' &&
      !Array.isArray(src[k])
    ) {
      target[k] = target[k] || {};
      mergeObject(target[k], src[k]);
    } else {
      target[k] = src[k];
    }
  });
}

function swaggerDocs(app, port = 3000) {
  const baseOptions = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'QR Queue API Documentation',
        version: '1.0.0',
        description: 'Documentation for backend APIs',
      },
      servers: [{ url: `http://localhost:${port}` }],
    },
    apis: [path.join(__dirname, '../routes/*.js')], // JSDoc from routes
  };

  // spec from JSDoc
  const jsSpec = swaggerJsdoc(baseOptions);

  // load all yaml files in docs folder and merge
  const docsDir = __dirname;
  const yamlFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

  const merged = {
    openapi: jsSpec.openapi || '3.0.3',
    info: jsSpec.info || baseOptions.definition.info,
    servers: jsSpec.servers || baseOptions.definition.servers,
    paths: jsSpec.paths || {},
    components: jsSpec.components || {},
  };

  yamlFiles.forEach((f) => {
    try {
      const doc = YAML.load(path.join(docsDir, f));
      if (!doc) return;
      if (doc.paths) Object.assign(merged.paths, doc.paths);
      if (doc.components) mergeObject(merged.components, doc.components);
      if (doc.security) merged.security = merged.security || doc.security;
      if (doc.servers) merged.servers = (merged.servers || []).concat(doc.servers);
    } catch (err) {
      console.warn('Failed to load swagger yaml', f, err.message || err);
    }
  });

  // mount Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(merged));
}

module.exports = swaggerDocs;