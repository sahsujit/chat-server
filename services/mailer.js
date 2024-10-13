const sgMail = require("@sendgrid/mail");

require("dotenv").config()

sgMail.setApiKey(process.env.SG_KEY)


const sendSGMail = ({
    to,
    sender,
    subject,
    html,
    attachments,
    text,
})=>{
    try{
        const from = "sah.sujit1388@gmail.com";

        const msg = {
          to: to, // Change to your recipient
          from: from, // Change to your verified sender
          subject: subject,
          html: html,
          // text: text,
          attachments,
        };
    
        
        return sgMail.send(msg);

    }catch(err){
        console.log(err)
    }
}



exports.sendEmail = async (args) => {
    if (!process.env.NODE_ENV === "development") {
      return Promise.resolve();
    } else {
      return sendSGMail(args);
    }
  };
  


  //