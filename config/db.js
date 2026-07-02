const sql = require("mssql");
require("dotenv").config();

const config = {
    server: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

async function connectDB() {
    try {
        await sql.connect(config);
        console.log("SQL Server connected.");
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    sql,
    connectDB
};