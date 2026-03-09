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
  const tierAccent = tier === 'GOLD' ? '#C9A84C' : '#6B6560';
  const tierBorder = tier === 'GOLD' ? '#C9A84C' : '#9E9892';

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #E8E2D9;background:#F9F7F3;width:140px;vertical-align:top;">
        <p style="margin:0;font-size:10px;text-transform:uppercase;letter-spacing:0.15em;color:#9E9892;font-weight:600;">${label}</p>
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid #E8E2D9;background:#ffffff;vertical-align:top;">
        <p style="margin:0;font-size:14px;color:#1C1A14;font-weight:500;">${value}</p>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>New Membership Application — Ekovibe Admin</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;border:1px solid #E8E2D9;">

          <!-- Header -->
          <tr>
            <td style="background:#1C1A14;padding:32px 40px;border-radius:20px 20px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 2px;font-size:14px;font-weight:800;letter-spacing:0.4em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
                    <p style="margin:0;font-size:11px;color:#6B5A35;letter-spacing:0.1em;text-transform:uppercase;">Admin Notification</p>
                  </td>
                  <td align="right">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border:1px solid ${tierBorder};border-radius:100px;padding:5px 16px;">
                          <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;color:${tierAccent};text-transform:uppercase;">${tierLabel} Tier</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">

              <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1C1A14;line-height:1.3;">New Application Received</h1>
              <p style="margin:0 0 28px;font-size:14px;color:#6B6560;line-height:1.6;">
                A new <strong style="color:#1C1A14;">${tierLabel} membership application</strong> has been submitted. Review the details below and take action.
              </p>

              <!-- Applicant Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E2D9;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                ${row('Full Name', fullName)}
                ${row('Email', email)}
                ${row('Phone', phone)}
                ${row('Occupation', occupation)}
                ${row('City', city)}
                ${row('Tier Requested', tierLabel)}
                ${referral ? row('How they heard', referral) : ''}
              </table>

              ${message ? `
              <p style="margin:0 0 10px;font-size:10px;letter-spacing:0.2em;color:#9E9892;text-transform:uppercase;font-weight:600;">Applicant Message</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#F9F7F3;border:1px solid #E8E2D9;border-left:4px solid ${tierAccent};border-radius:0 12px 12px 0;padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#1C1A14;line-height:1.7;">${message}</p>
                  </td>
                </tr>
              </table>
              ` : ''}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F3;border-top:1px solid #E8E2D9;padding:24px 40px;text-align:center;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.25em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <p style="margin:0;font-size:11px;color:#B8B0A8;">Admin System &mdash; ${new Date().toLocaleDateString('en-NG', { dateStyle: 'full' })}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
