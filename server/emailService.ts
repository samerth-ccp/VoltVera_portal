import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY!);

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
      text: params.text || '',
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('SendGrid error details:', JSON.stringify((error as any).response.body, null, 2));
      console.error('SendGrid response status:', (error as any).code);
      console.error('SendGrid response headers:', JSON.stringify((error as any).response.headers, null, 2));
    }
    return false;
  }
}

export async function sendSignupEmail(email: string, token: string): Promise<boolean> {
  // Use actual production domain
  const baseUrl = 'https://voltveratech.com';
  const signupUrl = `${baseUrl}/verify-email?token=${token}`;
  
  return sendEmail({
    to: email,
    from: 'noreply@voltveratech.com', // Using verified domain
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

export async function sendUserInvitationEmail(email: string, firstName: string, token: string): Promise<boolean> {
  // Use actual production domain
  const baseUrl = 'https://voltveratech.com';
  const invitationUrl = `${baseUrl}/complete-invitation?token=${token}`;
  
  return sendEmail({
    to: email,
    from: 'noreply@voltveratech.com', // Using verified domain
    subject: 'Welcome to Voltverashop - Complete Your Account Setup',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You've Been Invited to Voltverashop</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${firstName},</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            An administrator has created an account for you on Voltverashop. To complete your account setup and create your password, please click the button below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="
              background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              display: inline-block;
            ">Complete Account Setup</a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${invitationUrl}" style="color: #16a34a;">${invitationUrl}</a>
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            This invitation link will expire in 24 hours for security purposes.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2025 Voltverashop. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Hi ${firstName}, You've been invited to join Voltverashop! Complete your account setup by visiting: ${invitationUrl}`
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  // Use actual production domain
  const baseUrl = 'https://voltveratech.com';
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    from: 'noreply@voltveratech.com', // Using verified domain
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

export async function sendLoginCredentialsEmail(email: string, firstName: string, password: string): Promise<boolean> {
  // Use actual production domain
  const baseUrl = 'https://voltveratech.com';
  const loginUrl = `${baseUrl}/login`;
  
  return sendEmail({
    to: email,
    from: 'noreply@voltveratech.com', // Using verified domain
    subject: 'Welcome to Voltverashop - Your Account is Ready',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Voltverashop</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Hi ${firstName},</h2>
          <p style="color: #6b7280; line-height: 1.6;">
            Great news! Your account has been approved and is now ready. You can now access your Voltverashop dashboard using the credentials below.
          </p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Your Login Credentials</h3>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</code></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="
              background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              display: inline-block;
            ">Login to Your Account</a>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h4 style="color: #92400e; margin-top: 0; font-size: 14px;">🔒 Security Recommendation</h4>
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              For your security, we recommend changing your password after your first login. Go to Account Settings → Change Password.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${loginUrl}" style="color: #16a34a;">${loginUrl}</a>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2025 Voltverashop. All rights reserved.</p>
          <p>This email contains sensitive information. Please keep it secure.</p>
        </div>
      </div>
    `,
    text: `Hi ${firstName}, Welcome to Voltverashop! Your account is ready. Login details: Email: ${email}, Password: ${password}. Login at: ${loginUrl}`
  });
}