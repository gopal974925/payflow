import { sql } from "../config/db.js";
import { generateAcccesstoken, generateToken, revokerefreshToken, verifyrefreshToken } from "../config/generateToken.js";
import { sendMail } from "../config/mail.js";
import { getOtpHtml, getVerifyEmailHtml } from "../config/template.js";
import { loginSchema, registerSchema } from "../config/zod.js";
import { redisClient } from "../index.js";
import tryCatch from "../middleware/TryCatch.js";
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


export const loginuser=TryCatch(async(req,res)=>{
    const validation=loginSchema.safeParse(req.body);
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
    const { email, password } = validation.data;

    const rateLimitKey=`login-rate-limit:${req.ip}:${email}`;

     if(await redisClient.get(rateLimitKey)){
        return res.status(429).json({
            message:"Too many request , try again later",
        })
    }

  const [user] = await sql`
  SELECT email, password
  FROM users
  WHERE email = ${email}
`;


    if(!user){
        return res.status(400).json({
            message:"Invaild Credintial",
        })
    }

    const comparePassword=await bcrypt.compare(password,user.password);


    if(!comparePassword){
        return res.status(400).json({
            message:"Invaild Credintial",
        })
    }


    const otp=Math.floor(100000+Math.random()*900000).toString();

    const otpkey=`otp:${email}`;

    await redisClient.set(otpkey,JSON.stringify(otp),{EX:300});

    const subject="Otp for verification";

    const html=getOtpHtml({email,otp});
    await sendMail({email,subject,html});

    await redisClient.set(rateLimitKey,"true",{EX:60});


    res.json({
        message:"if your email is vaild , an otp has bben sent . It willl be vaild for 5 min",
    })
})


export const verifyotp=TryCatch(async(req,res)=>{
    const {email,otp}=req.body;

    if(!email || !otp){
        return res.status(400).json({
            message:"Please provide all details",
        })
    }

    const otpkey =`otp:${email}`;

    const storedotpkey=await redisClient.get(otpkey);

    if(!storedotpkey){
        return res.status(400).json({
            message:"Otp is expired",
        })
    }

    const soterdotp=JSON.parse(storedotpkey);

    if(soterdotp !== otp){
        return res.status(400).json({
            message:"invail otp",
        })
    }

    await redisClient.del(otpkey);

    const [user]=await sql` SELECT email,user_id,name from users 
    WHERE email=${email}`;

    if(!user){
        return res.status(400).json({
            message:"Somthing wen wrong",
        })
    }

    const tokendata=await generateToken(user.user_id,res);
    if(!tokendata){
        return res.status(400).json({
            message:"Somthing went wrong",
        })
    }

    res.status(200).json({
        message:`Welcome ${user.name}`,
        user,

    })


})

export const myprofile=TryCatch(async(req,res)=>{
    const user = req.user;

    res.json(user);
})

 export const refreshToken=TryCatch(async(req,res)=>{
    const refreshToken=req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(401).json({
            message:"invalid refresh token 123",
        })
    }
    const decode=await verifyrefreshToken(refreshToken);
    if(!decode){
        return res.status(401).json({
            message:"invaild refesh token",
        })
    }

    generateAcccesstoken(decode.id,res);

    res.status(200).json({
        message:"token refreshed ",
    })
})

export const logoutUser=tryCatch(async(req,res)=>{
    const user_id=req.user?.user_id;

    await revokerefreshToken(user_id);

    res.clearCookie("refreshToken");
    res.clearCookie("accessToken");

    await redisClient.del(`user:${user_id}`);

    res.json({
        messahe:"logged out Succesfullly",
    })
})

