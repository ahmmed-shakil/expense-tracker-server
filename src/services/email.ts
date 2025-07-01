import nodemailer from "nodemailer";

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Gmail app password
      },
    });
  }

  async sendOTP(email: string, otp: string, name: string): Promise<void> {
    const mailOptions = {
      from: {
        name: "Expense Tracker",
        address: process.env.EMAIL_USER!,
      },
      to: email,
      subject: "Password Reset OTP - Expense Tracker",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset OTP</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #1890ff;
              margin: 0;
              font-size: 28px;
            }
            .otp-container {
              background: #f8f9fa;
              border: 2px dashed #1890ff;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 20px 0;
            }
            .otp-code {
              font-size: 32px;
              font-weight: bold;
              color: #1890ff;
              letter-spacing: 8px;
              margin: 10px 0;
              font-family: monospace;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Expense Tracker</h1>
              <h2>Password Reset Request</h2>
            </div>
            
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>You requested to reset your password for your Expense Tracker account. Use the OTP code below to complete your password reset:</p>
            
            <div class="otp-container">
              <p style="margin: 0; font-size: 16px; color: #666;">Your OTP Code:</p>
              <div class="otp-code">${otp}</div>
              <p style="margin: 0; font-size: 14px; color: #666;">Valid for 15 minutes</p>
            </div>
            
            <p>Enter this code along with your new password to reset your account password.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              • This OTP is valid for 15 minutes only<br>
              • Never share this code with anyone<br>
              • If you didn't request this reset, please ignore this email
            </div>
            
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <div class="footer">
              <p>This is an automated email from Expense Tracker.<br>
              Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${name},

        You requested to reset your password for your Expense Tracker account.

        Your OTP Code: ${otp}

        This code is valid for 15 minutes. Enter this code along with your new password to reset your account password.

        If you didn't request a password reset, you can safely ignore this email.

        Best regards,
        Expense Tracker Team
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      // console.log(`OTP email sent successfully to ${email}:`, info.messageId);
    } catch (error: any) {
      console.error("Failed to send OTP email:", {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
      });
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  async verifyEmailConfiguration(): Promise<boolean> {
    try {
      console.log("Verifying email configuration...");
      await this.transporter.verify();
      console.log("✅ Email configuration verified successfully");
      return true;
    } catch (error: any) {
      console.error("❌ Email configuration verification failed:", {
        error: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
      });
      return false;
    }
  }
}

export const emailService = new EmailService();
