const User = require("../models/user");
const jwt = require("jsonwebtoken");
const filterObj = require("../utils/filterObj");
const otpGenerator = require("otp-generator")
require("dotenv").config()

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET)

exports.sendOTP = async (req, res, next) => {
    try {
        const { userId } = req;

        const new_otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            specialChars: false,
            lowerCaseAlphabets: false,
        });

        const otp_expiry_time = Date.now() + 10 * 60 * 1000;


        const user = await User.findByIdAndUpdate(userId, {
            otp_expiry_time: otp_expiry_time,
        });

        user.otp = new_otp.toString();

        await user.save({ new: true, validateModifiedOnly: true });


        //   Todo : send mail


        res.status(200).json({
            status: "success",
            message: "OTP Sent Successfully!",
        });
    } catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
}

exports.verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email,
            otp_expiry_time: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                status: "error",
                message: "Email is invalid or OTP expired",
            });
        }


        if (user.verified) {
            return res.status(400).json({
                status: "error",
                message: "Email is already verified",
            });
        }


        if (!(await user.correctOTP(otp, user.otp))) {
            res.status(400).json({
                status: "error",
                message: "OTP is incorrect",
            });

            return;
        }

        // OTP is correct

        user.verified = true;
        user.otp = undefined;
        await user.save({ new: true, validateModifiedOnly: true });

        const token = signToken(user._id);

        res.status(200).json({
            status: "success",
            message: "OTP verified Successfully!",
            token,
            user_id: user._id,
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
}

exports.register = async (req, res, next) => {
    try {

        const { firstName, lastName, email, password } = req.body;

        const filteredBody = filterObj(
            req.body,
            "firstName",
            "lastName",
            "email",
            "password"
        );


        if (!firstName || !lastName || !email || !password) {
            return res.status(404).json({
                message: "Please fill in all fields"
            })
        }

        const existing_user = await User.findOne({ email: email })


        if (existing_user && existing_user.verified) {
            // user with this email already exists, Please login
            return res.status(400).json({
                status: "error",
                message: "Email already in use, Please login.",
            });



        }
        else if (existing_user) {
            await User.findOneAndUpdate({ email: email }, filteredBody, {
                new: true,
                validateModifiedOnly: true,
            });

            req.userId = existing_user._id;
            next();
        }
        else {
            const new_user = await User.create(filteredBody);

            // generate an otp and send to email
            req.userId = new_user._id;
            next();
        }


    } catch (err) {
        res.status(500).json({
            message: "Somthing wrong while registering user"
        })
    }
}

exports.login = async (req, res, next) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter both email and password"
            });
        }

        const user = await User.findOne({ email: email }).select("+password")

        if (!user || !user.password) {
            res.status(400).json({
                status: "error",
                message: "Incorrect password",
            });

            return;
        }


        if (!user || !(await user.correctPassword(password, user.password))) {
            res.status(400).json({
                status: "error",
                message: "Email or password is incorrect",
            });

            return;
        }

        const token = signToken(user._id)


        res.status(200).json({
            status: "success",
            message: "Logged in successfully!",
            token,
            user_id: user._id,
        });



    } catch (err) {
        res.status(500).json({
            message: "Somthing wrong while creating login api"
        })
    }
}