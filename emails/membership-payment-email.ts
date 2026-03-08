interface MembershipPaymentEmailProps {
  fullName: string;
  tier: 'GOLD' | 'BLACK';
  amount: string; // formatted, e.g. "₦50,000"
  paymentUrl: string;
}

export function MembershipPaymentEmail({
  fullName,
  tier,
  amount,
  paymentUrl,
}: MembershipPaymentEmailProps): string {
  const tierLabel = tier === 'GOLD' ? 'Gold' : 'Black';
  const tierColor = tier === 'GOLD' ? '#C9A84C' : '#aaaaaa';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0A0A0A;border:1px solid #1a1a1a;padding:40px;">
              <p style="margin:0 0 16px;font-size:10px;letter-spacing:0.4em;color:#444444;text-transform:uppercase;">EKOVIBE</p>
              <span style="display:inline-block;padding:4px 16px;border:1px solid ${tierColor};color:${tierColor};font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:20px;">${tierLabel} Membership</span>
              <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.02em;line-height:1.1;">
                You've Been<br/>
                <span style="color:${tierColor};font-style:italic;">Approved</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#0A0A0A;border:1px solid #1a1a1a;border-top:none;padding:40px;">

              <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.6;">
                ${fullName}, your application for <strong style="color:#ffffff;">Ekovibe ${tierLabel} Membership</strong> has been approved.
                Complete your membership by making the one-time payment below.
              </p>

              <!-- Payment Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #1a1a1a;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Membership Tier</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:${tierColor};text-transform:uppercase;">${tierLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Amount Due</p>
                    <p style="margin:0;font-size:20px;font-weight:900;color:#ffffff;">${amount}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:12px;color:#555555;line-height:1.6;">
                This payment link is unique to your application and expires in 48 hours.
                Once payment is confirmed, your account will be upgraded automatically.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:${tier === 'GOLD' ? '#C9A84C' : '#ffffff'};">
                    <a href="${paymentUrl}"
                       style="display:inline-block;padding:16px 40px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#000000;text-decoration:none;">
                      Complete Payment
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:11px;color:#333333;line-height:1.6;">
                If you did not apply for Ekovibe membership or need help, contact us at
                <a href="mailto:the9ineagency@gmail.com" style="color:#888888;">the9ineagency@gmail.com</a>.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:9px;color:#333333;letter-spacing:0.3em;text-transform:uppercase;">
                EKOVIBE &bull; EKOVIBES LIFESTYLE GROUP
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
