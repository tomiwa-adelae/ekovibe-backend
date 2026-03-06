interface EntryConfirmedEmailProps {
  firstName: string;
  eventTitle: string;
  tierName: string;
  ticketCode: string;
  scannedAt: string;
}

export function EntryConfirmedEmail({
  firstName,
  eventTitle,
  tierName,
  ticketCode,
  scannedAt,
}: EntryConfirmedEmailProps): string {
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
                You're In,<br/>
                <span style="color:#22c55e;font-style:italic;">Enjoy the Night</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#0A0A0A;border:1px solid #1a1a1a;border-top:none;padding:40px;">

              <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.6;">
                ${firstName}, your ticket has been scanned and your entry confirmed at <strong style="color:#ffffff;">${eventTitle}</strong>.
              </p>

              <!-- Entry Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #1a1a1a;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Event</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;text-transform:uppercase;">${eventTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Ticket Tier</p>
                    <p style="margin:0;font-size:13px;color:#ffffff;">${tierName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Ticket Code</p>
                    <p style="margin:0;font-size:13px;font-family:monospace;letter-spacing:0.1em;color:#888888;">${ticketCode}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Entry Time</p>
                    <p style="margin:0;font-size:13px;color:#ffffff;">${scannedAt}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:11px;color:#444444;line-height:1.6;">
                This ticket has now been used and cannot be re-scanned. If you believe this was an error, contact us immediately.
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
