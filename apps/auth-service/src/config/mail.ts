import {createTransport} from "nodemailer";

export const sendMail=async({email,subject,html}: {email: string; subject: string; html: string})=>{
    const transport=createTransport({
        host:"smtp.gmail.com",
        port:465,
        auth:{
            user:process.env.NODEMAILER_USER,
            pass:process.env.NODEMAILER_PASSWORD,
        }
    })
    await transport.sendMail({
        from:process.env.NODEMAILER_USER,
        to:email,
        subject,
        html
    })
}