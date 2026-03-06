interface BookingConfirmationEmailProps {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  orderReference: string;
  tickets: { code: string; tierName: string }[];
}

export function BookingConfirmationEmail({
  firstName,
  eventTitle,
  eventDate,
  venueName,
  orderReference,
  tickets,
}: BookingConfirmationEmailProps): string {
  const ticketRows = tickets
    .map(
      (t, i) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:13px;">
          Ticket ${i + 1} — ${t.tierName}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #1a1a1a;color:#888888;font-size:11px;font-family:monospace;text-align:right;letter-spacing:0.1em;">
          ${t.code}
        </td>
      </tr>`,
    )
    .join('');

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
                Your Access<br/>
                <span style="color:#444444;font-style:italic;">Is Confirmed</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#0A0A0A;border:1px solid #1a1a1a;border-top:none;padding:40px;">

              <p style="margin:0 0 32px;font-size:14px;color:#888888;line-height:1.6;">
                ${firstName}, you're in. Your tickets for <strong style="color:#ffffff;">${eventTitle}</strong> have been confirmed.
                Present the QR codes below at the door.
              </p>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #1a1a1a;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Event</p>
                    <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;text-transform:uppercase;">${eventTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #1a1a1a;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Date</p>
                    <p style="margin:0;font-size:13px;color:#ffffff;">${eventDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;margin-bottom:4px;">Venue</p>
                    <p style="margin:0;font-size:13px;color:#ffffff;">${venueName}</p>
                  </td>
                </tr>
              </table>

              <!-- Ticket Codes -->
              <p style="margin:0 0 12px;font-size:9px;letter-spacing:0.3em;color:#444444;text-transform:uppercase;">Your Ticket Codes</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                ${ticketRows}
              </table>

              <p style="margin:0 0 32px;font-size:11px;color:#444444;line-height:1.6;">
                Your visual QR codes are available in your Ekovibe access portal. Log in and go to <strong style="color:#888888;">My Access</strong> to view and save them.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#ffffff;">
                    <a href="${process.env.FRONTEND_URL}/tickets"
                       style="display:inline-block;padding:16px 32px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#000000;text-decoration:none;">
                      View My Tickets
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:10px;color:#333333;letter-spacing:0.1em;text-transform:uppercase;">
                Order Ref: ${orderReference}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:9px;color:#333333;letter-spacing:0.3em;text-transform:uppercase;">
                EKOVIBE • DESTINATION &amp; VIBES
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
