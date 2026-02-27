import { Injectable, BadGatewayException } from '@nestjs/common';

@Injectable()
export class PaystackService {
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;
  private readonly baseUrl = 'https://api.paystack.co';

  private headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(params: {
    email: string;
    amount: number; // in kobo
    reference: string;
    metadata?: Record<string, any>;
    callback_url?: string;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!data.status) {
      // Log the full response to your terminal to see the exact reason
      console.error('Paystack Error Response:', data);
      throw new BadGatewayException(
        `Paystack initialization failed: ${data.message}`,
      );
    }

    return data.data;
  }

  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number;
    reference: string;
    customer: { email: string };
    metadata: Record<string, any>;
  }> {
    const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: this.headers(),
    });

    const data = await res.json();

    if (!data.status) {
      throw new BadGatewayException(
        `Paystack verification failed: ${data.message}`,
      );
    }

    return data.data;
  }
}
