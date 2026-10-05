import express from "express";
import { loginuser, registerUser, verifyotp, verifyUser } from "../controller/auth.js";

const router=express.Router();

router.post("/register",registerUser)
router.post("/verify/:token",verifyUser)
router.post("/login",loginuser)
router.post("/verify",verifyotp)
export default router;