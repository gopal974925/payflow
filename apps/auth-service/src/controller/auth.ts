import { sql } from "../config/db.js";
import { sendMail } from "../config/mail.js";
import { getVerifyEmailHtml } from "../config/template.js";
import { registerSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import TryCatch from "../middleware/TryCatch.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
export const registerUser=TryCatch(async(req,res)=>{
    const validation=registerSchema.safeParse(req.body);

    const zodError =validation.error;
    let firstErrormessage="validation Error";
    let allErrors:{field: string; message: string; code: string}[]=[];

    if(zodError?.issues && Array.isArray(zodError.issues)){
        allErrors=zodError.issues.map((issue)=>({
            field:issue.path?issue.path.join("."):"unknown",
            message:issue.message || "validation Error",
            code:issue.code,
        }));

        firstErrormessage=allErrors[0]?.message ||"validation Error";
    }
    if(!validation.success){
        return res.status(400).json(
            {
                message:firstErrormessage,
                errors:allErrors,
            }
        )
    }
    const { name, email, password } = validation.data;
    const ratelimitKey=`register-rate-limit: ${req.ip}:${email}`;
    if(await redisClient.get(ratelimitKey)){
        return res.status(429).json({
            message:"Too many request",
        })
    }
    const existingUser=await sql`SELECT email from users WHERE email =${email}`

    if(existingUser.length > 0){
        return res.status(400).json({
            message:"User already exist",
        })
    }

    const hashpassword=await bcrypt.hash(password,10);

    const verifyToken=crypto.randomBytes(32).toString("hex");

    const veriryKey=`verify:${verifyToken}`

    const datatostore=JSON.stringify({
        name,
        email,
        password:hashpassword,
    })

    await redisClient.set(veriryKey,datatostore,{EX:300});
    const subject ="verify your email for Account creation";
    const html=getVerifyEmailHtml({email,token:verifyToken});


    await sendMail({
        email,subject,html
    })
    await redisClient.set(ratelimitKey,"true",{EX:60});



res.json({
        message:"IF your  email is vaild ,a verification link has been sent to your email.it will expires in 5 min.",
})
})


export const verifyUser=TryCatch(async(req,res)=>{
    const {token} =req.params;
    if(!token){
        return res.status(400).json({
            message:"Verification token is required",
        })
    }

    const verifykey=`verify:${token}`;

    const userDatajson=await redisClient.get(verifykey);
    if(!userDatajson){
        return res.status(400).json({
            message:"verification link is expired",
        })
    }
    const userData=JSON.parse(userDatajson);

     const existingUser=await sql`SELECT email from users WHERE email =${userData.email}`

    if(existingUser.length > 0){
        return res.status(400).json({
            message:"User already exist",
        })
    }

  const [newUser] = await sql`
  INSERT INTO users (name, email, password)
  VALUES (${userData.name}, ${userData.email}, ${userData.password})
  RETURNING user_id, name, email;
`;
    await redisClient.del(verifykey);

    res.status(201).json({
        message:"Email verification is succesfully! You account has been created",
        user:{id:newUser.user_id,name:newUser.name,email:newUser.email},
    })

})