import Mailjet from 'node-mailjet'

const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_API_KEY || '',
    process.env.MAILJET_SECRET_KEY || ''
)

type SendVerificationEmailProps = {
    to: string
    code: string
}

export async function sendVerificationEmail({ to, code }: SendVerificationEmailProps) {
    try {
        const request = mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: 'ardontoonstra@hotmail.com',
                        Name: 'StateLink',
                    },
                    To: [
                        {
                            Email: to,
                        },
                    ],
                    Subject: 'Your Verification Code',
                    TextPart: `Your verification code is: ${code}. It expires in 30 minutes.`,
                    HTMLPart: `
            <h3>Welcome to StateLink!</h3>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 30 minutes.</p>
          `,
                },
            ],
        })

        const result = await request
        return result.body
    } catch (error) {
        console.error('Error sending email:', error)
        throw new Error('Failed to send verification email')
    }
}
