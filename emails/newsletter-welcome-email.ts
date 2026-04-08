export const NewsletterWelcomeEmail = ({
  unsubscribeUrl,
}: {
  unsubscribeUrl: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>You're In — The Vibe List</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F0E8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;border:1px solid #E8E2D9;">

          <!-- Header -->
          <tr>
            <td style="background:#1C1A14;padding:40px;text-align:center;border-radius:20px 20px 0 0;">
              <p style="margin:0 0 2px;font-size:18px;font-weight:800;letter-spacing:0.45em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <p style="margin:0;font-size:10px;letter-spacing:0.15em;color:#6B5A35;text-transform:uppercase;">Destination &amp; Vibes</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:#1C1A14;padding:40px;text-align:center;border-bottom:2px solid #C9A84C;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.3em;color:#C9A84C;text-transform:uppercase;font-weight:600;">The Vibe List</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">You're in the inner circle.</h1>
              <p style="margin:16px 0 0;font-size:15px;color:#9E9892;line-height:1.6;">Welcome to The Vibe List — weekly drops, just for you.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 28px;font-size:15px;color:#6B6560;line-height:1.7;">
                You're now confirmed on <strong style="color:#1C1A14;">The Vibe List</strong>. Every week, expect curated picks of the best events, exclusive early access, and everything worth knowing in Lagos' lifestyle scene.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F3;border:1px solid #E8E2D9;border-radius:12px;margin-bottom:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1C1A14;">Early Access</p>
                    <p style="margin:0;font-size:13px;color:#6B6560;line-height:1.6;">Be the first to know when new events drop — before they sell out.</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F3;border:1px solid #E8E2D9;border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#1C1A14;">Curated Picks</p>
                    <p style="margin:0;font-size:13px;color:#6B6560;line-height:1.6;">Weekly roundups of the most exciting events, venues, and drops across Lagos.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#C9A84C;border-radius:8px;">
                    <a href="${process.env.FRONTEND_URL}/ticketing"
                       style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1C1A14;text-decoration:none;">
                      Explore Experiences
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 4px;font-size:14px;color:#6B6560;">See you at the door,</p>
              <p style="margin:0;font-size:14px;font-weight:700;color:#1C1A14;">The Ekovibe Team</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F3;border-top:1px solid #E8E2D9;padding:28px 40px;text-align:center;border-radius:0 0 20px 20px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.25em;color:#C9A84C;text-transform:uppercase;">EKOVIBE</p>
              <p style="margin:0 0 8px;font-size:11px;color:#9E9892;">Lagos &bull; Abuja &bull; Ibadan</p>
              <p style="margin:0 0 6px;font-size:11px;color:#B8B0A8;">&copy; ${new Date().getFullYear()} Ekovibe Lifestyle Group</p>
              <p style="margin:0;font-size:11px;color:#B8B0A8;">
                <a href="${unsubscribeUrl}" style="color:#9E9892;text-decoration:underline;">Unsubscribe</a> from The Vibe List.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
