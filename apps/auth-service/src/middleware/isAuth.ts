import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { redisClient } from "../index.js";
import { sql } from "../config/db.js";

dotenv.config();

export const isAuth = async (req: any, res: any, next: any) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return res.status(403).json({
        message: "Please login - no token",
      });
    }

    const decodedData = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id?: number | string;
    };

    if (!decodedData || !decodedData.id) {
      return res.status(401).json({
        message: "Token expired or invalid",
      });
    }

    const cacheUser = await redisClient.get(`user:${decodedData.id}`);

    if (cacheUser) {
      req.user = JSON.parse(cacheUser);
      return next();
    }

    const [user] = await sql`
      SELECT user_id, name, email, role, created_at
      FROM users
      WHERE user_id = ${decodedData.id}
    `;

    if (!user) {
      return res.status(404).json({
        message: "No user with this id",
      });
    }

    await redisClient.setEx(`user:${user.user_id}`, 3600, JSON.stringify(user));

    req.user = user;
    return next();
  } catch (error: any) {
    console.log(error);
    return res.status(401).json({
      message: error.message || "Authentication failed",
    });
  }
};