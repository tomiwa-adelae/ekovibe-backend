export const MembershipApplicationConfirmationEmail = ({
  fullName,
  tier,
}: {
  fullName: string;
  tier: 'GOLD' | 'BLACK';
}) => {
  const tierLabel = tier === 'GOLD' ? 'Gold' : 'Black';
  const tierColor = tier === 'GOLD' ? '#C9A84C' : '#1A1A1A';

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Membership Application Received — Ekovibe</title>
    <style>
      body {
        font-family: 'Inter', 'Arial', sans-serif;
        background-color: #f9f9f9;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }
      .wrapper { background-color: #f9f9f9; padding: 40px 20px; }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
      }
      .header {
        background-color: #0A0A0A;
        padding: 40px;
        text-align: center;
      }
      .header h1 {
        color: #ffffff;
        margin: 0 0 8px;
        font-weight: 700;
        letter-spacing: 4px;
        font-size: 24px;
        text-transform: uppercase;
      }
      .tier-badge {
        display: inline-block;
        padding: 6px 20px;
        border: 1px solid ${tierColor};
        color: ${tier === 'GOLD' ? '#C9A84C' : '#aaaaaa'};
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 3px;
        text-transform: uppercase;
      }
      .content { padding: 40px; color: #333333; line-height: 1.7; }
      h2 {
        color: #0A0A0A;
        font-family: 'Georgia', serif;
        font-size: 22px;
        margin-bottom: 16px;
      }
      .highlight-box {
        background-color: #f5f5f5;
        border-left: 3px solid ${tierColor};
        padding: 20px 24px;
        margin: 28px 0;
        font-size: 14px;
        color: #555;
      }
      .footer {
        padding: 30px;
        text-align: center;
        font-size: 12px;
        color: #999999;
        background-color: #fcfcfc;
        border-top: 1px solid #e0e0e0;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <h1>Ekovibe</h1>
          <span class="tier-badge">${tierLabel} Membership</span>
        </div>
        <div class="content">
          <h2>We've received your application, ${fullName}.</h2>
          <p>
            Thank you for your interest in becoming an Ekovibe <strong>${tierLabel} Member</strong>.
            Your application has been received and is currently under review by our team.
          </p>
          <div class="highlight-box">
            Our concierge team personally reviews every application to ensure we're the right fit for each other.
            You can expect to hear from us within <strong>3–5 business days</strong>.
          </div>
          <p>
            In the meantime, feel free to explore our public experiences on the platform.
            We look forward to welcoming you into the Ekovibe ecosystem.
          </p>
          <p style="margin-top: 40px;">With warmth,</p>
          <p><strong>The Ekovibe Membership Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Ekovibe &mdash; Lagos &bull; Abuja &bull; Ibadan</p>
          <p>If you did not submit this application, please ignore this email.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};
