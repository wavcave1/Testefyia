'use strict';

require('dotenv').config();

const app = require('./app');

const PORT = parseInt(process.env.PORT || '3001', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Efyia Book backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
