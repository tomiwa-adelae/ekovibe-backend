export const MembershipApplicationConfirmationEmail = ({
  fullName,
  tier,
}: {
  fullName: string;
  tier: 'GOLD' | 'BLACK';
}) => {
  const tierLabel = tier === 'GOLD' ? 'Gold' : 'Black';
  const tierAccent = tier === 'GOLD' ? '#C9A84C' : '#6B6560';
  const tierBorder = tier === 'GOLD' ? '#C9A84C' : '#9E9892';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Membership Application Received — Ekovibe</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;border:1px solid #E8E2D9;">

          <!-- Header -->
          <tr>
            <td style="background:#1C1A14;padding:40px;text-align:center;border-radius:20px 20px 0 0;">
              <p style="margin:0 0 8px;font-size:16px;font-weight:800;letter-spacing:0.45em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="border:1px solid ${tierBorder};border-radius:100px;padding:6px 20px;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;color:${tierAccent};text-transform:uppercase;">${tierLabel} Membership</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#1C1A14;line-height:1.3;">
                We've received your<br/>application, ${fullName}.
              </h1>

              <p style="margin:16px 0 28px;font-size:15px;color:#6B6560;line-height:1.7;">
                Thank you for your interest in becoming an Ekovibe <strong style="color:#1C1A14;">${tierLabel} Member</strong>. Your application has been received and is currently under review by our team.
              </p>

              <!-- Highlight Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#F9F7F3;border:1px solid #E8E2D9;border-left:4px solid ${tierAccent};border-radius:0 12px 12px 0;padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#6B6560;line-height:1.7;">
                      Our concierge team personally reviews every application to ensure we're the right fit for each other. You can expect to hear from us within <strong style="color:#1C1A14;">3–5 business days</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;font-size:15px;color:#6B6560;line-height:1.7;">
                In the meantime, feel free to explore our public experiences on the platform. We look forward to welcoming you into the Ekovibe ecosystem.
              </p>

              <p style="margin:0 0 4px;font-size:14px;color:#6B6560;">With warmth,</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#1C1A14;">The Ekovibe Membership Team</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F3;border-top:1px solid #E8E2D9;padding:28px 40px;text-align:center;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.25em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <p style="margin:0 0 8px;font-size:11px;color:#9E9892;">Lagos &bull; Abuja &bull; Ibadan</p>
              <p style="margin:0 0 6px;font-size:11px;color:#B8B0A8;">&copy; ${new Date().getFullYear()} ekovibe Lifestyle Group</p>
              <p style="margin:0;font-size:11px;color:#B8B0A8;">If you did not submit this application, please ignore this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
