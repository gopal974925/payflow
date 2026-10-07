import jwt from "jsonwebtoken";
import { redisClient } from "../index.js";
import dotenv from "dotenv";
import type { Response } from "express";

dotenv.config();

const getJwtSecret = (name: string, legacyName?: string) => {
  const value = process.env[name] ?? (legacyName ? process.env[legacyName] : undefined);

  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }

  return value;
};

export const generateToken = async (id: string | number, res: Response) => {
  const accessTokenSecret = getJwtSecret("JWT_SECRET");
  const refreshTokenSecret = getJwtSecret("REFRESH_TOKEN_SECRET", "REFRESHTOEN_SECRET");

  const accessToken = jwt.sign({ id }, accessTokenSecret, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ id }, refreshTokenSecret, {
    expiresIn: "7d",
  });

  const refreshTokenKey = `refresh_token:${id}`;

  await redisClient.setEx(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
    // secure: true,
  });

  res.cookie("refreshToken", refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    // secure: true,
  });

  return { accessToken, refreshToken };
};


 export const verifyrefreshToken=async(refreshToken:string)=>{
  try {
    const decode= jwt.verify(refreshToken,process.env.REFRESHTOEN_SECRET as string);
    if (typeof decode === "string") {
      return null;
    }
    const storedData=await redisClient.get(`refresh_token:${decode.id}`);

    if(storedData===refreshToken){
      return decode;
    }
    return null;
  } catch {
    return null;
  }
}

export const generateAcccesstoken=async(id:string|number,res:Response)=>{
  const accessToken=jwt.sign({id},process.env.JWT_SECRET as string,{
    expiresIn:"1m",
  })

  res.cookie("accessToken",accessToken,{
    httpOnly:true,
    // secure:true,
    sameSite:"strict",
    maxAge:1*60*1000,
  })
}

export const revokerefreshToken=async(user_id:string|number)=>{
  await redisClient.del(`refresh_token:${user_id}`);
}
export const genetareToken = generateToken;