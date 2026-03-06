export const MembershipApplicationAdminEmail = ({
  fullName,
  email,
  phone,
  occupation,
  city,
  tier,
  referral,
  message,
}: {
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  city: string;
  tier: 'GOLD' | 'BLACK';
  referral?: string;
  message?: string;
}) => {
  const tierLabel = tier === 'GOLD' ? 'Gold' : 'Black';
  const tierColor = tier === 'GOLD' ? '#C9A84C' : '#1A1A1A';

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 10px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #888; width: 140px; vertical-align: top;">${label}</td>
      <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a; font-weight: 600;">${value}</td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>New Membership Application — Ekovibe</title>
    <style>
      body {
        font-family: 'Inter', 'Arial', sans-serif;
        background-color: #f0f0f0;
        margin: 0;
        padding: 0;
      }
      .wrapper { padding: 40px 20px; }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #ddd;
        border-radius: 4px;
        overflow: hidden;
      }
      .header {
        background-color: #0A0A0A;
        padding: 32px 40px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .header h1 {
        color: #fff;
        margin: 0;
        font-size: 20px;
        letter-spacing: 3px;
        text-transform: uppercase;
      }
      .tier-badge {
        display: inline-block;
        padding: 4px 14px;
        border: 1px solid ${tierColor};
        color: ${tier === 'GOLD' ? '#C9A84C' : '#aaa'};
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      .content { padding: 36px 40px; }
      .table { width: 100%; border-collapse: collapse; border-top: 1px solid #eee; margin-top: 16px; }
      .message-box {
        background: #f8f8f8;
        border-left: 3px solid ${tierColor};
        padding: 16px 20px;
        margin-top: 20px;
        font-size: 14px;
        color: #444;
        line-height: 1.6;
      }
      .footer {
        padding: 24px 40px;
        background: #f9f9f9;
        font-size: 11px;
        color: #aaa;
        border-top: 1px solid #eee;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <h1>New Application</h1>
          <span class="tier-badge">${tierLabel} Tier</span>
        </div>
        <div class="content">
          <p style="font-size: 14px; color: #555; margin: 0 0 20px;">
            A new <strong>${tierLabel} membership application</strong> has been submitted. Review the details below.
          </p>
          <table class="table">
            ${row('Full Name', fullName)}
            ${row('Email', email)}
            ${row('Phone', phone)}
            ${row('Occupation', occupation)}
            ${row('City', city)}
            ${row('Tier Requested', tierLabel)}
            ${referral ? row('How they heard', referral) : ''}
          </table>
          ${message ? `<div class="message-box"><strong>Message:</strong><br/>${message}</div>` : ''}
        </div>
        <div class="footer">
          Ekovibe Admin System &mdash; ${new Date().toLocaleDateString('en-NG', { dateStyle: 'full' })}
        </div>
      </div>
    </div>
  </body>
</html>
`;
};
