// Implement `runFaq(message: string): Promise<AgentResponse>`.
// Use a hard-coded map<string, string> of FAQ questions to answers.
// Do a simple similarity check (lower-case, contains key phrase) to find a match.
// If matched, return the answer with confidence 1.0.
// If no match, return { text: '', confidence: 0 }.

import { AgentResponse } from './types';

const FAQ_MAP: Record<string, string> = {
    'reset password': 'To reset your password, go to the login page and click "Forgot Password". Enter your email address and follow the instructions sent to your inbox.',
    'vpn setup': 'To set up VPN, download the VPN client from the IT portal, install it, and use your company credentials to connect. Select the server closest to your location.',
    'install office': 'To install Microsoft Office, go to office.com, sign in with your company account, and click "Install Office". Follow the installation wizard.',
    'wifi password': 'The guest WiFi password is "GuestAccess2024". For employee WiFi, use your network credentials.',
    'support hours': 'Our IT support hours are Monday-Friday, 8 AM - 6 PM EST. For urgent issues outside these hours, call the emergency hotline at ext. 911.'
};

export async function runFaq(message: string): Promise<AgentResponse> {
    const lowerMessage = message.toLowerCase();

    // Check each FAQ key for a match
    for (const [key, answer] of Object.entries(FAQ_MAP)) {
        if (lowerMessage.includes(key)) {
            return {
                text: answer,
                confidence: 1.0,
                meta: { faqKey: key }
            };
        }
    }

    // No match found
    return {
        text: '',
        confidence: 0
    };
}
