'use strict';
const app = require('./app');
const { host, puerto } = require('./config');

app.listen(puerto, host, error => {
  if (error) throw error;
  console.log(`API disponible en http://${host}:${puerto}/api/productos`);
});
