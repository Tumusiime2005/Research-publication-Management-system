import { getGoogleAccessToken, auth } from './googleAuth';

interface SendNotificationOptions {
  toEmail: string;
  recipientName: string;
  subject: string;
  headerTitle: string;
  bodyContent: string;
  paperTitle?: string;
  paperStatus?: string;
  decisionNotes?: string;
}

/**
 * Creates an RFC 2822 compliant email message encoded in URL-safe Base64 for Gmail API
 */
function createRawEmail(to: string, from: string, subject: string, plainText: string, htmlContent: string): string {
  const boundary = `__brainhub_${Date.now()}__`;
  const utf8Subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const lines = [
    `To: ${to}`,
    `From: BRAIN HUB System <${from}>`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    plainText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    htmlContent,
    '',
    `--${boundary}--`,
  ];

  const fullMessage = lines.join('\r\n');
  const base64 = btoa(unescape(encodeURIComponent(fullMessage)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Sends a real email notification via Gmail API to the recipient's inbox and mobile device.
 */
export async function sendGmailNotification(options: SendNotificationOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const accessToken = getGoogleAccessToken();
  const currentUser = auth.currentUser;

  if (!accessToken || !currentUser) {
    return {
      success: false,
      error: 'Google Account is not currently connected. Please sign in with Google to enable device Gmail notifications.',
    };
  }

  const senderEmail = currentUser.email || 'me';

  const plainText = `BRAIN HUB RESEARCH NOTIFICATION
--------------------------------------------------
Hello ${options.recipientName},

${options.headerTitle}

${options.bodyContent}

${options.paperTitle ? `Publication: "${options.paperTitle}"` : ''}
${options.paperStatus ? `Status: ${options.paperStatus}` : ''}
${options.decisionNotes ? `Editorial Notes: ${options.decisionNotes}` : ''}

Log in to BRAIN HUB to view details or manage your publication.
Open Access Peer-Reviewed Research Commons
`;

  const statusColor =
    options.paperStatus === 'APPROVED'
      ? '#16a34a'
      : options.paperStatus === 'REJECTED'
      ? '#f97316'
      : '#6d28d9';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e1b4b;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #6d28d9; padding: 20px 24px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">BRAIN HUB</h1>
      <p style="margin: 4px 0 0; font-size: 12px; color: #b0d9f2;">Research Publication Management System</p>
    </div>
    
    <div style="padding: 28px 24px;">
      <h2 style="font-size: 18px; color: #1e1b4b; margin: 0 0 12px; font-weight: 700;">${options.headerTitle}</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px;">
        Dear <strong>${options.recipientName}</strong>,<br/><br/>
        ${options.bodyContent}
      </p>

      ${
        options.paperTitle
          ? `
      <div style="background-color: #f1f5f9; border-left: 4px solid #6d28d9; padding: 14px 16px; border-radius: 6px; margin: 18px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Publication Title</div>
        <div style="font-size: 14px; font-weight: 700; color: #1e1b4b;">${options.paperTitle}</div>
        ${
          options.paperStatus
            ? `<div style="margin-top: 8px;"><span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 800; border-radius: 4px; color: #ffffff; background-color: ${statusColor};">${options.paperStatus}</span></div>`
            : ''
        }
      </div>`
          : ''
      }

      ${
        options.decisionNotes
          ? `
      <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px 16px; margin: 18px 0;">
        <div style="font-size: 11px; font-weight: 700; color: #6d28d9; text-transform: uppercase; margin-bottom: 4px;">Editorial Verification Notes</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.5; font-style: italic;">"${options.decisionNotes}"</div>
      </div>`
          : ''
      }

      <div style="margin: 24px 0 12px; text-align: center;">
        <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://brain-hub.vercel.app'}" 
           style="display: inline-block; background-color: #6d28d9; color: #ffffff; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Open BRAIN HUB Repository
        </a>
      </div>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
      <p style="margin: 0;">This official peer-review notification was sent via BRAIN HUB Gmail Integration.</p>
      <p style="margin: 4px 0 0;">MARON PRIME THE LEGENDARY SYSTEMS ANALYST · +256 769849051</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const raw = createRawEmail(options.toEmail, senderEmail, options.subject, plainText, htmlContent);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errMsg = errorJson?.error?.message || response.statusText;
      console.error('Gmail send error:', errMsg);
      return { success: false, error: errMsg };
    }

    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (err: any) {
    console.error('Failed to dispatch email via Gmail API:', err);
    return { success: false, error: err?.message || 'Failed to send email' };
  }
}
