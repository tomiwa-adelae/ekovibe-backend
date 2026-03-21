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

  async initializeTransactionWithSplit(params: {
    email: string;
    amount: number; // in kobo
    reference: string;
    subaccount?: string; // venue's subaccount code
    transaction_charge?: number; // platform flat fee in kobo (goes to main account)
    metadata?: Record<string, any>;
    callback_url?: string;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    const body: Record<string, any> = {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callback_url,
    };
    if (params.subaccount) {
      body.subaccount = params.subaccount;
      body.bearer = 'account'; // Ekovibe bears Paystack transaction fees
      if (params.transaction_charge !== undefined) {
        body.transaction_charge = params.transaction_charge;
      }
    }

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.status) {
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

  async createSubaccount(params: {
    business_name: string;
    bank_code: string;
    account_number: string;
    percentage_charge: number; // e.g. 0.9 for 90% to subaccount
  }): Promise<{ subaccount_code: string }> {
    const res = await fetch(`${this.baseUrl}/subaccount`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!data.status) {
      console.error('Paystack Subaccount Error:', data);
      throw new BadGatewayException(
        `Paystack subaccount creation failed: ${data.message}`,
      );
    }
    return data.data;
  }

  async refundTransaction(params: {
    transaction: string; // paystack reference
    amount?: number; // partial refund in kobo; omit for full refund
  }): Promise<void> {
    const res = await fetch(`${this.baseUrl}/refund`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!data.status) {
      console.error('Paystack Refund Error:', data);
      throw new BadGatewayException(
        `Paystack refund failed: ${data.message}`,
      );
    }
  }
}
