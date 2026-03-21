interface BookingConfirmationEmailProps {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  venueName: string;
  orderReference: string;
  tickets: { code: string; tierName: string }[];
  eventImageUrl?: string;
}

export function BookingConfirmationEmail({
  firstName,
  eventTitle,
  eventDate,
  venueName,
  orderReference,
  tickets,
  eventImageUrl,
}: BookingConfirmationEmailProps): string {
  const ticketRows = tickets
    .map(
      (t, i) => `
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #E8E2D9;background:#FFFFFF;">
          <p style="margin:0 0 3px;font-size:13px;font-weight:600;color:#1C1A14;">Ticket ${i + 1} — ${t.tierName}</p>
          <p style="margin:0;font-size:11px;font-family:'Courier New',Courier,monospace;color:#9E9892;letter-spacing:0.08em;">${t.code}</p>
        </td>
      </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your Tickets — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;border:1px solid #E8E2D9;">

          <!-- Header -->
          <tr>
            <td style="background:#1C1A14;padding:32px 40px;border-radius:20px 20px 0 0;">
              <p style="margin:0 0 2px;font-size:14px;font-weight:800;letter-spacing:0.4em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <p style="margin:0;font-size:10px;letter-spacing:0.15em;color:#6B5A35;text-transform:uppercase;">Destination &amp; Vibes</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">

              ${
                eventImageUrl
                  ? `
              <img src="${eventImageUrl}" width="520" alt="${eventTitle}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;margin-bottom:32px;"/>
              `
                  : ''
              }

              <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#1C1A14;line-height:1.2;">
                Your Access<br/><span style="color:#C9A84C;">Is Confirmed</span>
              </h1>

              <p style="margin:16px 0 32px;font-size:15px;color:#6B6560;line-height:1.7;">
                ${firstName}, you're in. Your tickets for <strong style="color:#1C1A14;">${eventTitle}</strong> have been confirmed. Present the QR codes below at the door.
              </p>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E2D9;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E8E2D9;background:#F9F7F3;border-radius:12px 12px 0 0;">
                    <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.2em;color:#9E9892;text-transform:uppercase;">Event</p>
                    <p style="margin:0;font-size:15px;font-weight:700;color:#1C1A14;">${eventTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #E8E2D9;background:#F9F7F3;">
                    <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.2em;color:#9E9892;text-transform:uppercase;">Date</p>
                    <p style="margin:0;font-size:14px;color:#1C1A14;">${eventDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;background:#F9F7F3;border-radius:0 0 12px 12px;">
                    <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.2em;color:#9E9892;text-transform:uppercase;">Venue</p>
                    <p style="margin:0;font-size:14px;color:#1C1A14;">${venueName}</p>
                  </td>
                </tr>
              </table>

              <!-- Ticket Codes -->
              <p style="margin:0 0 12px;font-size:10px;letter-spacing:0.2em;color:#9E9892;text-transform:uppercase;font-weight:600;">Your Ticket Codes</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E2D9;border-radius:12px;overflow:hidden;margin-bottom:32px;">
                ${ticketRows}
              </table>

              <p style="margin:0 0 28px;font-size:13px;color:#9E9892;line-height:1.7;">
                Your visual QR codes are available in your Ekovibe access portal. Log in and go to <strong style="color:#6B6560;">My Access</strong> to view and save them.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#1C1A14;border-radius:8px;">
                    <a href="${process.env.FRONTEND_URL}/tickets"
                       style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                      View My Tickets
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:11px;color:#B8B0A8;letter-spacing:0.05em;">
                Order Ref: <span style="font-family:'Courier New',Courier,monospace;">${orderReference}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F3;border-top:1px solid #E8E2D9;padding:28px 40px;text-align:center;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.25em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <p style="margin:0 0 8px;font-size:11px;color:#9E9892;">Lagos &bull; Abuja &bull; Ibadan</p>
              <p style="margin:0;font-size:11px;color:#B8B0A8;">&copy; ${new Date().getFullYear()} ekovibe Lifestyle Group</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
