import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { sql } from "./config/db.js";
import authroutes from "./routes/authRoutes.js";
import { createClient } from "redis";

dotenv.config();
const redisUrl=process.env.REDIS_URL;

if(!redisUrl){
  console.log("Missing redis url");
  process.exit(1);
}


export const redisClient=createClient({
  url:redisUrl,
})

redisClient.connect()
.then(()=>console.log("Connected to redis"))
.catch(console.error)
const app = express();
app.use(express.json());
app.use(cookieParser());
const PORT = process.env.PORT;
const APPNAME = process.env.APPNAME;

async function initDb() {
    try {
        await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'user_role'
        ) THEN
          CREATE TYPE user_role AS ENUM ('Normal-user', 'Merchant');
        END IF;
      END
      $$;
    `;

       

        await sql`CREATE TABLE IF NOT EXISTS users(
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role user_role DEFAULT 'Normal-user',
        created_at TIMESTAMP DEFAULT NOW()
        
        )`;
        console.log("DB initilization Sucessful")
    } catch (error) {
        console.error('Failed to connect',error);
        process.exit(1);
    }
    
}

app.use("/api/v1",authroutes);

initDb().then(()=>{
    app.listen(PORT,()=>{
    console.log(`${APPNAME} is ruuning  on port ${PORT}`)
})
})
