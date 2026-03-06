export const WelcomeEmail = ({ firstName }: { firstName: string }) => {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Welcome to Ekovibe</title>
    <style>
      body { 
        font-family: 'Playfair Display', 'Georgia', serif; 
        background-color: #f9f9f9; 
        margin: 0; 
        padding: 0; 
        -webkit-font-smoothing: antialiased;
      }
      .wrapper { 
        background-color: #f9f9f9; 
        padding: 40px 20px; 
      }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background-color: #ffffff; 
        border: 1px solid #e0e0e0;
        border-radius: 4px; 
        overflow: hidden;
      }
      .header { 
        background-color: #0A0A0A; 
        padding: 40px; 
        text-align: center; 
      }
      .header h1 { 
        color: #ffffff; 
        margin: 0; 
        font-weight: 700; 
        letter-spacing: 4px; 
        font-size: 24px; 
        text-transform: uppercase;
      }
      .content { 
        padding: 40px; 
        color: #333333; 
        line-height: 1.6; 
        font-family: 'Inter', 'Arial', sans-serif;
      }
      h2 { 
        color: #0A0A0A; 
        font-family: 'Playfair Display', serif; 
        font-size: 22px; 
        margin-bottom: 20px; 
      }
      .accent { 
        color: #2E8B57; /* Till Green */
        font-weight: bold; 
      }
      .btn-container {
        text-align: center;
        margin-top: 30px;
      }
      .btn { 
        display: inline-block; 
        padding: 16px 32px; 
        background-color: #0A0A0A; 
        color: #ffffff !important; 
        border-radius: 0px; 
        text-decoration: none; 
        font-weight: 600; 
        text-transform: uppercase;
        font-size: 14px;
        letter-spacing: 1px;
      }
      .footer { 
        padding: 30px; 
        text-align: center; 
        font-size: 12px; 
        color: #999999; 
        background-color: #fcfcfc;
      }
      .footer a { color: #2E8B57; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <h1>Ekovibe</h1>
        </div>
        <div class="content">
          <h2>Welcome to the Movement, ${firstName}.</h2>
          <p>Your Ekovibe account is now active. You're now part of Lagos' premier lifestyle platform — your gateway to exclusive events, curated nightlife, and experiences that define the culture.</p>
          <p>Browse upcoming events, secure your tickets, and access your passes from your personal dashboard.</p>

          <div class="btn-container">
            <a href="${process.env.FRONTEND_URL}/ticketing" class="btn">Explore Experiences</a>
          </div>

          <p style="margin-top: 40px;">See you at the door,</p>
          <p><strong>The Ekovibe Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Ekovibes Lifestyle Group</p>
          <p>Lagos &bull; Abuja &bull; Ibadan</p>
          <p>If you did not create this account, please <a href="mailto:the9ineagency@gmail.com">contact support</a>.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;
};
