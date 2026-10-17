const mysql = require('mysql2');
require('dotenv').config();

const ssl =
  process.env.DB_SSL === 'true'
    ? { ca: process.env.DB_CA, rejectUnauthorized: true }
    : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();
