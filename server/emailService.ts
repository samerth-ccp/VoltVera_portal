import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendSignupEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.FRONTEND_URL || (process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000');
  const signupUrl = `${baseUrl}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    from: 'noreply@voltverashop.com', // Update this to your verified sender
    subject: 'Welcome to Voltverashop - Verify Your Email',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Voltverashop</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Verify Your Email Address</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            Thank you for signing up! Please click the button below to verify your email address and complete your registration.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupUrl}" style="
              background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              display: inline-block;
            ">Verify Email Address</a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${signupUrl}" style="color: #16a34a;">${signupUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          This email was sent from Voltverashop. If you didn't request this, please ignore this email.
        </div>
      </div>
    `,
    text: `Welcome to Voltverashop! Please verify your email by visiting: ${signupUrl}`
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const baseUrl = process.env.FRONTEND_URL || (process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://localhost:5000');
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    from: 'noreply@voltverashop.com', // Update this to your verified sender
    subject: 'Voltverashop - Reset Your Password',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Voltverashop</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            You requested to reset your password. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="
              background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              display: inline-block;
            ">Reset Password</a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #16a34a;">${resetUrl}</a>
          </p>
          
          <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
            This link will expire in 1 hour for security purposes.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          If you didn't request this password reset, please ignore this email.
        </div>
      </div>
    `,
    text: `Reset your Voltverashop password by visiting: ${resetUrl}`
  });
}