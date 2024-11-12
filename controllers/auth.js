const User = require("../models/user");
const jwt = require("jsonwebtoken");
const filterObj = require("../utils/filterObj");
const otpGenerator = require("otp-generator")
const mailService = require("../services/mailer")
const crypto = require("crypto");
const { promisify } = require("util");
const otp = require("../Templates/Mail/otp");
const emailTemplate = require("../Templates/Mail/emailVerificationTemplate")
// const resetPassword = require("../Templates/Mail/resetPassword");
const mailSender = require("../services/mailer");
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
        // mailService.sendEmail({
        //     from: "sah.sujit1388@gmail.com",
        //     to: user.email,
        //     subject: "Verification OTP",
        //     html:otp(user.firstName, new_otp),
        //     attachments: [],
        //   });

          await mailSender(user.email,
            "Verification Email From Chat App", 
            emailTemplate(new_otp));

        res.status(200).json({
            status: "success",
            message: "OTP Sent Successfully!",
            data:new_otp
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



// Protect
exports.protect = async (req, res, next) => {
    // 1) Getting token and check if it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
  
    if (!token) {
      return res.status(401).json({
        message: "You are not logged in! Please log in to get access.",
      });
    }
    // 2) Verification of token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  
    console.log(decoded);
  
    // 3) Check if user still exists
  
    const this_user = await User.findById(decoded.userId);
    if (!this_user) {
      return res.status(401).json({
        message: "The user belonging to this token does no longer exists.",
      });
    }
    // 4) Check if user changed password after the token was issued
    if (this_user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        message: "User recently changed password! Please log in again.",
      });
    }
  
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = this_user;
    next();
  };


exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "There is no user with email address.",
            });
        }

        // 2) Generate the random reset token
        const resetToken = user.createPasswordResetToken();

        await user.save({ validateBeforeSave: false });

        try {
            const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;


            console.log("resetToken:", resetToken)
            //Todo send mail


    // mailService.sendEmail({
    //     from: "sah.sujit1388@gmail.com",
    //     to: user.email,
    //     subject: "Reset Password",
    //     html: resetPassword(user.firstName, resetURL),
    //     attachments: [],
    //   });
      await mailSender(user.email,
        "Password Reset Link",
        `Password Reset Link : ${resetURL}`);


            res.status(200).json({
                status: "success",
                message: "Token sent to email!",
            });

        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                message: "There was an error sending the email. Try again later!",
            });
        }

    } catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
}



exports.resetPassword = async (req, res, next) => {
    try {

        const hashedToken = crypto
            .createHash("sha256")
            .update(req.body.token)
            .digest("hex");

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                status: "error",
                message: "Token is Invalid or Expired",
            });
        }
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        const token = signToken(user._id);

        res.status(200).json({
            status: "success",
            message: "Password Reseted Successfully",
            token,
        });



    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: err.message
        })
    }
}

