interface WithdrawalApprovedEmailProps {
  firstName: string;
  amount: string; // formatted e.g. "₦50,000"
  bankName?: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}

export function WithdrawalApprovedEmail({
  firstName,
  amount,
  accountNumber,
  accountName,
  reference,
}: WithdrawalApprovedEmailProps): string {
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
                Withdrawal<br/>
                <span style="color:#22c55e;font-style:italic;">Approved</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#0A0A0A;border:1px solid #1a1a1a;border-top:none;padding:40px;">

              <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.6;">
                ${firstName}, your withdrawal request has been approved and the transfer is being processed. Funds will arrive in your account shortly.
              </p>

              <!-- Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #1a1a1a;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Amount</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#22c55e;">${amount}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Account Name</p>
                    <p style="margin:0;font-size:13px;color:#ffffff;">${accountName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Account Number</p>
                    <p style="margin:0;font-size:13px;color:#ffffff;font-family:monospace;">${accountNumber}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Reference</p>
                    <p style="margin:0;font-size:11px;color:#555555;font-family:monospace;">${reference}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;font-size:13px;color:#555555;line-height:1.6;">
                Bank transfers typically arrive within a few minutes to a few hours. If you do not receive your funds within 24 hours, please contact support.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#ffffff;">
                    <a href="${process.env.FRONTEND_URL}/vendor/wallet"
                       style="display:inline-block;padding:16px 32px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#000000;text-decoration:none;">
                      View Wallet
                    </a>
                  </td>
                </tr>
              </table>

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
