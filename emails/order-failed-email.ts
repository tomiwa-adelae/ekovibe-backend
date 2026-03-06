interface OrderFailedEmailProps {
  firstName: string;
  eventTitle: string;
  orderReference: string;
}

export function OrderFailedEmail({
  firstName,
  eventTitle,
  orderReference,
}: OrderFailedEmailProps): string {
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
              <p style="margin:0 0 24px;font-size:10px;letter-spacing:0.4em;color:#444444;text-transform:uppercase;">
                EKOVIBE
              </p>
              <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:-0.02em;line-height:1.1;">
                Payment<br/>
                <span style="color:#ef4444;font-style:italic;">Unsuccessful</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#0A0A0A;border:1px solid #1a1a1a;border-top:none;padding:40px;">

              <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.6;">
                ${firstName}, your payment for <strong style="color:#ffffff;">${eventTitle}</strong> could not be processed.
                No charge has been made to your account.
              </p>

              <!-- Order Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #1a1a1a;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Event</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;text-transform:uppercase;">${eventTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Order Reference</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;letter-spacing:0.1em;color:#888888;">${orderReference}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:12px;color:#555555;line-height:1.7;">Common reasons for payment failure:</p>
              <ul style="margin:0 0 32px;padding-left:20px;color:#555555;font-size:12px;line-height:2;">
                <li>Insufficient funds</li>
                <li>Card declined by your bank</li>
                <li>3DS authentication not completed</li>
                <li>Transaction limit exceeded</li>
              </ul>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#ffffff;">
                    <a href="${process.env.FRONTEND_URL}/ticketing"
                       style="display:inline-block;padding:16px 32px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#000000;text-decoration:none;">
                      Try Again
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:11px;color:#333333;line-height:1.6;">
                If you continue to experience issues, contact us at
                <a href="mailto:the9ineagency@gmail.com" style="color:#888888;">the9ineagency@gmail.com</a>
                and quote your order reference.
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
