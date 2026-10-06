import express from "express";
import { loginuser, myprofile, registerUser, verifyotp, verifyUser } from "../controller/auth.js";
import { isAuth } from "../middleware/isAuth.js";

const router=express.Router();

router.post("/register",registerUser)
router.post("/verify/:token",verifyUser)
router.post("/login",loginuser)
router.post("/verify",verifyotp)
router.get("/me",isAuth,myprofile)
export default router;