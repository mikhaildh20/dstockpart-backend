import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let pool;

const connect = async () => {
    if (!pool) {
        pool = await sql.connect(config);
        console.log("🔥 DB connected");
    }
    return pool;
};

// wrapper query biar bisa db.query(...)
const query = async (queryString, params = []) => {
    const pool = await connect();
    const request = pool.request();

    // handle parameter (optional)
    params.forEach((param) => {
        request.input(param.name, param.type, param.value);
    });

    const result = await request.query(queryString);
    return result.recordset;
};

export default {
    query,
    sql, 
};